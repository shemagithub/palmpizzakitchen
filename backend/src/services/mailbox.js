import "../loadEnv.js";
import { setServers } from "node:dns";
import { lookup } from "node:dns/promises";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { query } from "../db.js";

const MAIL_FALLBACK_IP =
  process.env.IMAP_IP || process.env.MAIL_SERVER_IP || "68.65.123.100";

const SECRET_SETTING_KEYS = [
  "imap_user",
  "imap_pass",
  "imap_host",
  "imap_ip",
  "imap_port",
  "imap_tls_name",
  "mailbox_name",
  "mailbox_smtp_port",
];

/** @type {Record<string, string> | null} */
let dbMailboxCache = null;
let dbMailboxCacheAt = 0;

function cleanPass(value) {
  return String(value || "").replace(/^['"]|['"]$/g, "");
}

export function invalidateMailboxCache() {
  dbMailboxCache = null;
  dbMailboxCacheAt = 0;
}

export async function refreshMailboxSettings() {
  try {
    const placeholders = SECRET_SETTING_KEYS.map(() => "?").join(",");
    const rows = await query(
      `SELECT setting_key, setting_value FROM settings
       WHERE setting_key IN (${placeholders})`,
      SECRET_SETTING_KEYS,
    );
    dbMailboxCache = Object.fromEntries(
      rows.map((r) => [r.setting_key, String(r.setting_value ?? "")]),
    );
    dbMailboxCacheAt = Date.now();
  } catch {
    dbMailboxCache = dbMailboxCache || {};
  }
  return dbMailboxCache;
}

async function ensureMailboxSettings() {
  if (dbMailboxCache && Date.now() - dbMailboxCacheAt < 10_000) {
    return dbMailboxCache;
  }
  return refreshMailboxSettings();
}

function dbVal(key) {
  return String(dbMailboxCache?.[key] || "").trim();
}

async function resolveMailHost(hostname) {
  const name = String(hostname || "").trim() || "palmpizzakitchen.com";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(name)) {
    return {
      host: name,
      servername:
        dbVal("imap_tls_name") ||
        process.env.IMAP_TLS_NAME ||
        "palmpizzakitchen.com",
    };
  }
  try {
    const { address } = await lookup(name, { family: 4 });
    if (address) return { host: address, servername: name };
  } catch {
    /* try public resolvers next */
  }
  try {
    setServers(["8.8.8.8", "1.1.1.1", "9.9.9.9"]);
    const { address } = await lookup(name, { family: 4 });
    if (address) return { host: address, servername: name };
  } catch {
    /* last resort: known cPanel IPv4 */
  }
  const fallback =
    dbVal("imap_ip") ||
    process.env.IMAP_IP ||
    process.env.MAIL_SERVER_IP ||
    MAIL_FALLBACK_IP;
  return { host: fallback, servername: name };
}

export function mailboxConfig() {
  const user = String(
    dbVal("imap_user") ||
      process.env.IMAP_USER ||
      process.env.MAILBOX_USER ||
      "info@palmpizzakitchen.com",
  ).trim();
  const pass = cleanPass(
    dbVal("imap_pass") ||
      process.env.IMAP_PASS ||
      process.env.MAILBOX_PASS ||
      "",
  );
  const host =
    dbVal("imap_host") ||
    process.env.IMAP_HOST ||
    process.env.SMTP_HOST ||
    "palmpizzakitchen.com";
  return {
    user,
    pass,
    host,
    imapPort: Number(
      dbVal("imap_port") || process.env.IMAP_PORT || 993,
    ),
    smtpPort: Number(
      dbVal("mailbox_smtp_port") ||
        process.env.MAILBOX_SMTP_PORT ||
        process.env.SMTP_PORT ||
        465,
    ),
    displayName:
      dbVal("mailbox_name") ||
      process.env.MAILBOX_NAME ||
      "Palm Pizza Kitchen",
  };
}

export function isMailboxConfigured() {
  const { user, pass } = mailboxConfig();
  return Boolean(user && pass);
}

async function createClient() {
  await ensureMailboxSettings();
  const { host, imapPort, user, pass } = mailboxConfig();
  if (!user || !pass) {
    throw new Error(
      "Mailbox is not configured. Open Admin → Mailbox and save the info@ email password, or set IMAP_PASS on the backend.",
    );
  }
  const resolved = await resolveMailHost(host);
  return new ImapFlow({
    host: resolved.host,
    port: imapPort,
    secure: true,
    auth: { user, pass },
    logger: false,
    tls: {
      minVersion: "TLSv1.2",
      servername: resolved.servername,
      rejectUnauthorized: process.env.IMAP_TLS_INSECURE !== "1",
    },
  });
}

async function withClient(fn) {
  const client = await createClient();
  try {
    await client.connect();
    return await fn(client);
  } catch (err) {
    const message = String(err?.message || err);
    if (/auth|invalid credentials|login/i.test(message)) {
      throw new Error("Mailbox login failed. Check IMAP_USER and IMAP_PASS.");
    }
    if (/timeout|ECONNREFUSED|ENOTFOUND|certificate/i.test(message)) {
      throw new Error(
        `Cannot reach the mail server (${mailboxConfig().host}). ${message}`,
      );
    }
    throw err;
  } finally {
    try {
      await client.logout();
    } catch {
      try {
        client.close();
      } catch {
        /* ignore */
      }
    }
  }
}

function addrList(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => {
      const name = item?.name ? String(item.name).trim() : "";
      const address = item?.address ? String(item.address).trim() : "";
      if (!name && !address) return "";
      return name ? `${name} <${address}>` : address;
    })
    .filter(Boolean);
}

function firstAddress(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  const item = list[0];
  if (!item) return { name: "", email: "" };
  return {
    name: String(item.name || "").trim(),
    email: String(item.address || "").trim(),
  };
}

function collectAttachments(node, acc = []) {
  if (!node) return acc;
  const disp = String(node.disposition || "").toLowerCase();
  const filename =
    node.dispositionParameters?.filename ||
    node.parameters?.name ||
    "";
  const isAttach =
    disp === "attachment" ||
    (filename && disp !== "inline") ||
    (node.type &&
      node.type !== "text" &&
      node.type !== "multipart" &&
      disp === "attachment");
  if (filename || isAttach) {
    acc.push({
      part: node.part || "1",
      filename: filename || "attachment",
      contentType: `${node.type || "application"}/${node.subtype || "octet-stream"}`,
      size: Number(node.size || 0),
    });
  }
  for (const child of node.childNodes || []) {
    collectAttachments(child, acc);
  }
  return acc;
}

function folderKind(path, specialUse = "") {
  const p = String(path || "").toLowerCase();
  const use = String(specialUse || "").toLowerCase();
  if (use.includes("inbox") || p === "inbox") return "inbox";
  if (use.includes("sent") || p.includes("sent")) return "sent";
  if (use.includes("draft") || p.includes("draft")) return "drafts";
  if (use.includes("junk") || p.includes("junk") || p.includes("spam")) {
    return "junk";
  }
  if (use.includes("trash") || p.includes("trash") || p.includes("deleted")) {
    return "trash";
  }
  if (use.includes("archive") || p.includes("archive")) return "archive";
  if (p.includes("star") || p.includes("flag") || p.includes("favourite")) {
    return "favourites";
  }
  return "label";
}

const LABEL_COLORS = ["#22c55e", "#3b82f6", "#ec4899", "#f59e0b", "#8b5cf6"];

const STANDARD_FOLDERS = [
  { kind: "inbox", name: "Inbox", fallbacks: ["INBOX"] },
  { kind: "drafts", name: "Drafts", fallbacks: ["INBOX.Drafts", "Drafts"] },
  { kind: "sent", name: "Sent", fallbacks: ["INBOX.Sent", "Sent"] },
  {
    kind: "junk",
    name: "Junk",
    fallbacks: ["INBOX.Junk", "Junk", "INBOX.spam", "Spam"],
  },
  { kind: "trash", name: "Trash", fallbacks: ["INBOX.Trash", "Trash"] },
  { kind: "archive", name: "Archive", fallbacks: ["INBOX.Archive", "Archive"] },
];

function pickFolderForKind(kind, folders) {
  const matches = folders.filter((f) => f.kind === kind);
  if (kind === "junk") {
    return (
      matches.find((f) => /junk/i.test(f.path) || /junk/i.test(f.name)) ||
      matches[0] ||
      null
    );
  }
  return matches[0] || null;
}

function withStandardFolders(folders) {
  const extra = [];
  for (const spec of STANDARD_FOLDERS) {
    if (pickFolderForKind(spec.kind, folders)) continue;
    extra.push({
      path: spec.fallbacks[0],
      name: spec.name,
      kind: spec.kind,
      specialUse: "",
      total: 0,
      unread: 0,
    });
  }
  return [...folders, ...extra];
}

async function openMailbox(client, folder) {
  const requested = String(folder || "INBOX").trim() || "INBOX";
  try {
    const lock = await client.mailboxOpen(requested);
    return lock?.path || requested;
  } catch {
    /* resolve folder aliases below */
  }

  const boxes = await client.list();
  const selectable = boxes.filter(
    (box) =>
      !box.flags?.has("\\Noselect") && !box.flags?.has("\\NonExistent"),
  );
  const paths = selectable.map((box) => box.path);
  const kind = folderKind(requested);
  const spec = STANDARD_FOLDERS.find((item) => item.kind === kind);
  const candidates = [];
  for (const box of selectable) {
    if (folderKind(box.path, box.specialUse || "") === kind) {
      candidates.push(box.path);
    }
  }
  if (kind === "junk") {
    candidates.sort((a, b) => Number(/junk/i.test(b)) - Number(/junk/i.test(a)));
  }
  for (const fallback of spec?.fallbacks || []) {
    if (!candidates.includes(fallback)) candidates.push(fallback);
  }
  for (const path of candidates) {
    if (!paths.includes(path)) continue;
    const lock = await client.mailboxOpen(path);
    return lock?.path || path;
  }
  throw new Error(`Mailbox folder "${requested}" was not found.`);
}

const LIST_FETCH_QUERY = {
  uid: true,
  envelope: true,
  flags: true,
  internalDate: true,
  size: true,
};

async function fetchListedMessages(client, range, mailboxPath, options = {}) {
  const messages = [];
  try {
    const rows = await client.fetchAll(range, LIST_FETCH_QUERY, options);
    for (const msg of rows || []) {
      if (msg?.uid) messages.push(mapListedMessage(msg, mailboxPath));
    }
  } catch {
    try {
      for await (const msg of client.fetch(range, LIST_FETCH_QUERY, options)) {
        if (msg?.uid) messages.push(mapListedMessage(msg, mailboxPath));
      }
    } catch {
      /* try UID search fallback in caller */
    }
  }
  return messages;
}

async function listAllUids(client, exists) {
  try {
    const found = await client.search({ all: true }, { uid: true });
    if (Array.isArray(found) && found.length) {
      return found.map(Number).filter(Boolean);
    }
  } catch {
    /* cPanel SEARCH ALL is unreliable; fall through */
  }
  const uids = [];
  const range = exists > 0 ? `1:${exists}` : "1:*";
  try {
    for await (const msg of client.fetch(range, { uid: true })) {
      if (msg?.uid) uids.push(Number(msg.uid));
    }
  } catch {
    /* empty */
  }
  return uids;
}

export async function listFolders() {
  return withClient(async (client) => {
    const boxes = await client.list();
    const folders = [];
    for (const box of boxes) {
      if (box.flags?.has("\\Noselect") || box.flags?.has("\\NonExistent")) {
        continue;
      }
      const kind = folderKind(box.path, box.specialUse || "");
      let status = { messages: 0, unseen: 0 };
      try {
        status = await client.status(box.path, {
          messages: true,
          unseen: true,
        });
      } catch {
        /* some folders refuse STATUS */
      }
      folders.push({
        path: box.path,
        name: box.name || box.path,
        kind,
        specialUse: box.specialUse || "",
        total: Number(status.messages || 0),
        unread: Number(status.unseen || 0),
      });
    }

    folders.sort((a, b) => {
      const order = [
        "inbox",
        "drafts",
        "sent",
        "junk",
        "trash",
        "archive",
        "favourites",
        "label",
      ];
      return order.indexOf(a.kind) - order.indexOf(b.kind);
    });

    const listed = withStandardFolders(folders);
    const labels = listed
      .filter((f) => f.kind === "label")
      .map((f, i) => ({
        ...f,
        color: LABEL_COLORS[i % LABEL_COLORS.length],
      }));

    return { folders: listed, labels };
  });
}

export async function createLabel(name) {
  const clean = String(name || "")
    .trim()
    .replace(/[\\/."]/g, "")
    .slice(0, 40);
  if (!clean) throw new Error("Label name is required.");
  return withClient(async (client) => {
    const boxes = await client.list();
    const prefix = boxes.some((b) => String(b.path).startsWith("INBOX."))
      ? "INBOX."
      : "";
    const path = `${prefix}${clean}`;
    await client.mailboxCreate(path);
    return { ok: true, path };
  });
}

export async function listMessages({
  folder = "INBOX",
  q = "",
  filter = "all",
  page = 1,
  pageSize = 200,
} = {}) {
  return withClient(async (client) => {
    const mailboxPath =
      folder === "favourites" || folder === "starred"
        ? await openMailbox(client, "INBOX")
        : await openMailbox(client, folder);
    const exists = Number(client.mailbox?.exists || 0);
    const pageNum = Math.max(1, Number(page) || 1);
    const size = Math.min(500, Math.max(1, Number(pageSize) || 200));
    const term = String(q || "").trim().toLowerCase();
    const wantsFlagged =
      filter === "starred" || folder === "favourites" || folder === "starred";
    const wantsUnread = filter === "unread";

    let messages = [];
    if (exists) {
      messages = await fetchListedMessages(
        client,
        `1:${exists}`,
        mailboxPath,
      );
    }
    if (!messages.length && exists) {
      messages = await fetchListedMessages(client, "1:*", mailboxPath);
    }
    if (!messages.length && exists) {
      const uids = await listAllUids(client, exists);
      if (uids.length) {
        messages = await fetchListedMessages(client, uids, mailboxPath, {
          uid: true,
        });
      }
    }

    if (wantsUnread) messages = messages.filter((msg) => msg.unseen);
    if (wantsFlagged) messages = messages.filter((msg) => msg.flagged);
    if (term) {
      messages = messages.filter((msg) => {
        const hay = [
          msg.subject,
          msg.preview,
          msg.from?.name,
          msg.from?.email,
          ...(msg.to || []),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(term);
      });
    }

    messages.sort(
      (a, b) =>
        new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
    );
    const total = wantsUnread || wantsFlagged || term ? messages.length : Math.max(exists, messages.length);
    const slice = messages.slice((pageNum - 1) * size, pageNum * size);
    return {
      total,
      page: pageNum,
      pageSize: size,
      messages: slice,
      folder: mailboxPath,
    };
  });
}

function mapListedMessage(msg, mailboxPath) {
  const from = firstAddress(msg.envelope?.from);
  const flags = [...(msg.flags || [])];
  return {
    uid: msg.uid,
    folder: mailboxPath,
    subject: msg.envelope?.subject || "(No subject)",
    preview: addrList(msg.envelope?.to).join(", "),
    from,
    to: addrList(msg.envelope?.to),
    date: msg.internalDate || msg.envelope?.date || null,
    unseen: !flags.some((f) => String(f).toLowerCase() === "\\seen"),
    flagged: flags.some((f) => String(f).toLowerCase() === "\\flagged"),
    answered: flags.some((f) => String(f).toLowerCase() === "\\answered"),
    attachments: collectAttachments(msg.bodyStructure),
    size: Number(msg.size || 0),
  };
}

function sanitizeHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=/gi, " data-on=")
    .replace(/javascript:/gi, "");
}

export async function getMessage(folder, uid) {
  return withClient(async (client) => {
    await client.mailboxOpen(folder);
    const raw = await client.download(Number(uid), undefined, { uid: true });
    if (!raw?.content) throw new Error("Message not found.");
    const parsed = await simpleParser(raw.content);
    try {
      await client.messageFlagsAdd(
        Number(uid),
        ["\\Seen"],
        { uid: true },
      );
    } catch {
      /* ignore */
    }
    const attachments = (parsed.attachments || []).map((att, index) => ({
      index,
      filename: att.filename || `attachment-${index + 1}`,
      contentType: att.contentType || "application/octet-stream",
      size: att.size || att.content?.length || 0,
      cid: String(att.cid || att.contentId || "").replace(/^<|>$/g, ""),
      inline:
        String(att.contentDisposition || "").toLowerCase() === "inline" ||
        Boolean(att.cid || att.contentId),
    }));
    let html = sanitizeHtml(parsed.html || "");
    for (const att of parsed.attachments || []) {
      const cid = String(att.cid || att.contentId || "").replace(/^<|>$/g, "");
      if (!cid || !att.content) continue;
      const mime = att.contentType || "application/octet-stream";
      const b64 = Buffer.from(att.content).toString("base64");
      const dataUrl = `data:${mime};base64,${b64}`;
      const escaped = cid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      html = html.replace(new RegExp(`cid:${escaped}`, "gi"), dataUrl);
    }
    return {
      uid: Number(uid),
      folder,
      subject: parsed.subject || "(No subject)",
      from: {
        name: parsed.from?.value?.[0]?.name || "",
        email: parsed.from?.value?.[0]?.address || "",
      },
      to: addrList(parsed.to?.value),
      cc: addrList(parsed.cc?.value),
      date: parsed.date || null,
      text: parsed.text || "",
      html,
      messageId: parsed.messageId || "",
      inReplyTo: parsed.inReplyTo || "",
      references: parsed.references
        ? Array.isArray(parsed.references)
          ? parsed.references.join(" ")
          : String(parsed.references)
        : "",
      attachments,
    };
  });
}

export async function getAttachment(folder, uid, index) {
  return withClient(async (client) => {
    await client.mailboxOpen(folder);
    const raw = await client.download(Number(uid), undefined, { uid: true });
    if (!raw?.content) throw new Error("Message not found.");
    const parsed = await simpleParser(raw.content);
    const att = parsed.attachments?.[Number(index)];
    if (!att) throw new Error("Attachment not found.");
    return {
      filename: att.filename || `attachment-${index}`,
      contentType: att.contentType || "application/octet-stream",
      content: Buffer.isBuffer(att.content)
        ? att.content
        : Buffer.from(att.content || []),
    };
  });
}

export async function setFlags(folder, uid, { seen, flagged, deleted } = {}) {
  return withClient(async (client) => {
    await client.mailboxOpen(folder);
    const id = Number(uid);
    if (seen === true) {
      await client.messageFlagsAdd(id, ["\\Seen"], { uid: true });
    }
    if (seen === false) {
      await client.messageFlagsRemove(id, ["\\Seen"], { uid: true });
    }
    if (flagged === true) {
      await client.messageFlagsAdd(id, ["\\Flagged"], { uid: true });
    }
    if (flagged === false) {
      await client.messageFlagsRemove(id, ["\\Flagged"], { uid: true });
    }
    if (deleted === true) {
      await client.messageFlagsAdd(id, ["\\Deleted"], { uid: true });
      try {
        await client.messageDelete(id, { uid: true });
      } catch {
        /* some servers need expunge only */
      }
    }
    return { ok: true };
  });
}

export async function moveMessage(fromFolder, uid, toFolder) {
  return withClient(async (client) => {
    await client.mailboxOpen(fromFolder);
    await client.messageMove(Number(uid), toFolder, { uid: true });
    return { ok: true };
  });
}

function htmlToText(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

async function mailboxTransport() {
  const { host, smtpPort, user, pass } = mailboxConfig();
  const resolved = await resolveMailHost(host);
  return nodemailer.createTransport({
    host: resolved.host,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user, pass },
    tls: { minVersion: "TLSv1.2", servername: resolved.servername },
  });
}

export async function sendMailboxMessage({
  to,
  cc,
  bcc,
  subject,
  text,
  html,
  inReplyTo,
  references,
  attachments = [],
  saveDraft = false,
}) {
  const { user, displayName } = mailboxConfig();
  if (!to?.trim()) throw new Error("Recipient is required.");

  const mail = {
    from: `${displayName} <${user}>`,
    to: to.trim(),
    cc: cc?.trim() || undefined,
    bcc: bcc?.trim() || undefined,
    subject: subject?.trim() || "(No subject)",
    text: text || htmlToText(html) || "",
    html: html || undefined,
    inReplyTo: inReplyTo || undefined,
    references: references || undefined,
    attachments: (attachments || [])
      .filter((file) => file?.content && file?.filename)
      .map((file) => ({
        filename: String(file.filename),
        content: file.content,
        encoding: file.encoding || "base64",
        contentType: file.contentType || "application/octet-stream",
      })),
  };

  if (saveDraft) {
    return withClient(async (client) => {
      const boxes = await client.list();
      const draft =
        boxes.find((b) => folderKind(b.path, b.specialUse) === "drafts")
          ?.path || "INBOX.Drafts";
      try {
        await client.mailboxOpen(draft);
      } catch {
        await client.mailboxCreate(draft);
        await client.mailboxOpen(draft);
      }
      const source = [
        `From: ${mail.from}`,
        `To: ${mail.to}`,
        mail.cc ? `Cc: ${mail.cc}` : null,
        `Subject: ${mail.subject}`,
        `Date: ${new Date().toUTCString()}`,
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=utf-8",
        "",
        mail.text || "",
      ]
        .filter((line) => line !== null)
        .join("\r\n");
      await client.append(draft, Buffer.from(source), ["\\Draft"]);
      return { ok: true, draft: true };
    });
  }

  const info = await (await mailboxTransport()).sendMail(mail);

  await withClient(async (client) => {
    const boxes = await client.list();
    const sent =
      boxes.find((b) => folderKind(b.path, b.specialUse) === "sent")?.path ||
      "INBOX.Sent";
    try {
      await client.mailboxOpen(sent);
    } catch {
      await client.mailboxCreate(sent);
    }
    const source = [
      `From: ${mail.from}`,
      `To: ${mail.to}`,
      mail.cc ? `Cc: ${mail.cc}` : null,
      `Subject: ${mail.subject}`,
      `Date: ${new Date().toUTCString()}`,
      info.messageId ? `Message-ID: ${info.messageId}` : null,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      mail.text || "",
    ]
      .filter((line) => line !== null)
      .join("\r\n");
    try {
      await client.append(sent, Buffer.from(source), ["\\Seen"]);
    } catch {
      /* Sent copy is optional */
    }
  }).catch(() => null);

  return { ok: true, messageId: info.messageId };
}
