import {
  createLabel,
  getAttachment,
  getMessage,
  isMailboxConfigured,
  listFolders,
  listMessages,
  mailboxConfig,
  moveMessage,
  sendMailboxMessage,
  setFlags,
} from "../../../backend/src/services/mailbox.js";

const LIVE_API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://backend.palmpizzakitchen.com/api"
).replace(/\/$/, "");

function ensureImapEnv() {
  process.env.IMAP_HOST ||= "palmpizzakitchen.com";
  process.env.IMAP_IP ||= "68.65.123.100";
  process.env.IMAP_TLS_NAME ||= "palmpizzakitchen.com";
  process.env.IMAP_PORT ||= "993";
  process.env.IMAP_USER ||= "info@palmpizzakitchen.com";
  process.env.MAILBOX_NAME ||= "Palm Pizza Kitchen";
  process.env.MAILBOX_SMTP_PORT ||= "465";
}

export async function assertAdmin(auth: string) {
  const res = await fetch(`${LIVE_API}/mailbox/config`, {
    headers: { Authorization: auth },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) {
    throw Object.assign(new Error("Admin sign in required."), {
      status: res.status,
    });
  }
  if (!res.ok) {
    throw Object.assign(new Error("Could not verify admin session."), {
      status: 401,
    });
  }
}

export async function handleShopMailbox(opts: {
  method: string;
  slug: string[];
  search: URLSearchParams;
  body: Record<string, unknown> | null;
}): Promise<{
  status: number;
  json?: unknown;
  binary?: {
    content: Buffer;
    contentType: string;
    filename: string;
    download: boolean;
  };
}> {
  ensureImapEnv();
  const { method, slug, search, body } = opts;
  const [a, b, c, d] = slug;

  if (method === "GET" && a === "config") {
    const cfg = mailboxConfig();
    return {
      status: 200,
      json: {
        configured: isMailboxConfigured(),
        email: cfg.user,
        name: cfg.displayName,
        host: cfg.host,
        imapPort: cfg.imapPort,
        smtpPort: cfg.smtpPort,
      },
    };
  }

  if (method === "GET" && a === "folders") {
    return { status: 200, json: await listFolders() };
  }

  if (method === "POST" && a === "folders") {
    return { status: 201, json: await createLabel(String(body?.name || "")) };
  }

  if (method === "GET" && a === "messages" && b && c === "attachments" && d) {
    const att = await getAttachment(
      String(search.get("folder") || "INBOX"),
      b,
      d,
    );
    return {
      status: 200,
      binary: {
        content: att.content,
        contentType: att.contentType || "application/octet-stream",
        filename: att.filename || "attachment",
        download: search.get("download") === "1",
      },
    };
  }

  if (method === "GET" && a === "messages" && b && !c) {
    return {
      status: 200,
      json: {
        message: await getMessage(String(search.get("folder") || "INBOX"), b),
      },
    };
  }

  if (method === "GET" && a === "messages") {
    return {
      status: 200,
      json: await listMessages({
        folder: String(search.get("folder") || "INBOX"),
        q: String(search.get("q") || ""),
        filter: String(search.get("filter") || "all"),
        page: Number(search.get("page") || 1),
        pageSize: Number(search.get("pageSize") || 200),
      }),
    };
  }

  if (method === "POST" && a === "messages" && b && c === "flags") {
    return {
      status: 200,
      json: await setFlags(
        String(body?.folder || search.get("folder") || "INBOX"),
        b,
        {
          seen: body?.seen,
          flagged: body?.flagged,
          deleted: body?.deleted,
        },
      ),
    };
  }

  if (method === "POST" && a === "messages" && b && c === "move") {
    const to = String(body?.to || "").trim();
    if (!to) return { status: 400, json: { error: "Destination folder required." } };
    return {
      status: 200,
      json: await moveMessage(
        String(body?.from || search.get("folder") || "INBOX"),
        b,
        to,
      ),
    };
  }

  if (method === "POST" && a === "send") {
    return { status: 201, json: await sendMailboxMessage((body || {}) as never) };
  }

  return { status: 404, json: { error: "Unknown mailbox route." } };
}
