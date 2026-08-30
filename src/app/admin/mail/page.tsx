"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { api, apiDownload } from "@/lib/api";

type Folder = {
  path: string;
  name: string;
  kind: string;
  total: number;
  unread: number;
  color?: string;
};

type MailRow = {
  uid: number;
  folder: string;
  subject: string;
  preview: string;
  from: { name: string; email: string };
  to: string[];
  date: string | null;
  unseen: boolean;
  flagged: boolean;
  attachments: { filename: string; size: number; contentType: string }[];
};

type MailDetail = {
  uid: number;
  folder: string;
  subject: string;
  from: { name: string; email: string };
  to: string[];
  cc: string[];
  date: string | null;
  text: string;
  html: string;
  messageId: string;
  inReplyTo: string;
  references: string;
  attachments: {
    index: number;
    filename: string;
    contentType: string;
    size: number;
    cid?: string;
    inline?: boolean;
  }[];
};

const MAIL_NAV = [
  { kind: "inbox", name: "Inbox", fallback: "INBOX" },
  { kind: "drafts", name: "Drafts", fallback: "INBOX.Drafts" },
  { kind: "sent", name: "Sent", fallback: "INBOX.Sent" },
  { kind: "junk", name: "Junk", fallback: "INBOX.Junk" },
  { kind: "trash", name: "Trash", fallback: "INBOX.Trash" },
  { kind: "archive", name: "Archive", fallback: "INBOX.Archive" },
] as const;

function resolveFolderPath(kind: string, fallback: string, folders: Folder[]) {
  const matches = folders.filter((f) => f.kind === kind);
  if (kind === "junk") {
    return (
      matches.find((f) => /junk/i.test(f.path) || /junk/i.test(f.name))?.path ||
      matches[0]?.path ||
      fallback
    );
  }
  return matches[0]?.path || fallback;
}

function MailFolderIcon({ kind, className = "" }: { kind: string; className?: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "inbox") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path {...common} d="M3 12.5 5.5 4h13L21 12.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6.5Z" />
        <path {...common} d="M3 12.5h5.2a3.8 3.8 0 0 0 7.6 0H21" />
      </svg>
    );
  }
  if (kind === "drafts") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path {...common} d="M5 19h3.4L19 8.4 15.6 5 5 15.6V19Z" />
        <path {...common} d="m13.8 6.8 3.4 3.4" />
      </svg>
    );
  }
  if (kind === "sent") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path {...common} d="M4 11.5 20 5l-6.5 15-2.2-6.3L4 11.5Z" />
      </svg>
    );
  }
  if (kind === "junk") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <circle cx="12" cy="12" r="8" {...common} />
        <path {...common} d="m8 8 8 8" />
      </svg>
    );
  }
  if (kind === "trash") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path {...common} d="M5 7h14M9 7V5h6v2m-8 0 1 13h8l1-13" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...common} d="M5 7.5h14v11H5v-11Z" />
      <path {...common} d="M5 7.5 12 12l7-4.5" />
    </svg>
  );
}

function initials(name?: string, email?: string) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function formatListDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

function formatFullDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fileSize(n?: number) {
  const bytes = Number(n) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExt(name?: string, type?: string) {
  const fromName = String(name || "").split(".").pop() || "";
  if (fromName && fromName !== name) return fromName.toUpperCase().slice(0, 4);
  const sub = String(type || "").split("/")[1] || "FILE";
  return sub.toUpperCase().slice(0, 4);
}

function previewKind(name?: string, type?: string) {
  const t = String(type || "").toLowerCase();
  const n = String(name || "").toLowerCase();
  if (t.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(n)) {
    return "image";
  }
  if (t.includes("pdf") || n.endsWith(".pdf")) return "pdf";
  if (
    t.startsWith("text/") ||
    t.includes("json") ||
    t.includes("xml") ||
    /\.(txt|csv|md|json|xml|html|ics|vcf|log)$/.test(n)
  ) {
    return "text";
  }
  return "file";
}

function htmlToText(html: string) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

type ComposeDraft = {
  to: string;
  cc: string;
  bcc?: string;
  subject: string;
  html?: string;
  text: string;
  inReplyTo?: string;
  references?: string;
};

function emptyDraft(partial: Partial<ComposeDraft> = {}): ComposeDraft {
  return {
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    html: "",
    text: "",
    ...partial,
  };
}

function mailboxError(err: unknown) {
  const msg = err instanceof Error ? err.message : "";
  if (
    /503|not installed|missing on the server|Mailbox files|unavailable/i.test(
      msg,
    )
  ) {
    return "Could not open the shop mailbox. Confirm IMAP_PASS is set for info@palmpizzakitchen.com.";
  }
  return msg || "Could not load mail.";
}

function quote(detail: MailDetail) {
  const who = detail.from.name || detail.from.email;
  const when = formatFullDate(detail.date);
  const body = detail.text || "";
  return `\n\nOn ${when}, ${who} wrote:\n${body
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n")}`;
}

export default function AdminMailboxPage() {
  const [config, setConfig] = useState<{
    email?: string;
    name?: string;
    configured?: boolean;
    needsSetup?: boolean;
    host?: string;
  }>({
    name: "Palm Pizza Kitchen",
    email: "info@palmpizzakitchen.com",
    needsSetup: false,
  });
  const [setupUser, setSetupUser] = useState("info@palmpizzakitchen.com");
  const [setupPass, setSetupPass] = useState("");
  const [setupHost, setSetupHost] = useState("palmpizzakitchen.com");
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupOk, setSetupOk] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [labels, setLabels] = useState<Folder[]>([]);
  const [folder, setFolder] = useState("INBOX");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [qInput, setQInput] = useState("");
  const [rows, setRows] = useState<MailRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState<MailRow | null>(null);
  const [detail, setDetail] = useState<MailDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [compose, setCompose] = useState<ComposeDraft | null>(null);
  const [composeError, setComposeError] = useState("");
  const [sending, setSending] = useState(false);
  const [labelName, setLabelName] = useState("");
  const [addingLabel, setAddingLabel] = useState(false);
  const [mobilePane, setMobilePane] = useState<"list" | "read">("list");
  const [preview, setPreview] = useState<{
    url: string;
    name: string;
    type: string;
    kind: ReturnType<typeof previewKind>;
  } | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const currentFolder = folders.find((f) => f.path === folder);

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreview(null);
    setPreviewError("");
  }, []);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const loadFolders = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, data] = await Promise.all([
        api<{
          email: string;
          name: string;
          configured: boolean;
          needsSetup?: boolean;
          host?: string;
        }>("/mailbox/config"),
        api<{ folders: Folder[]; labels: Folder[]; error?: string }>(
          "/mailbox/folders",
        ),
      ]);
      setConfig({
        email: cfg.email || "info@palmpizzakitchen.com",
        name: cfg.name || "Palm Pizza Kitchen",
        configured: cfg.configured,
        needsSetup: Boolean(cfg.needsSetup || !cfg.configured),
        host: cfg.host,
      });
      if (cfg.email) setSetupUser(cfg.email);
      if (cfg.host) setSetupHost(cfg.host);
      const nextFolders = data.folders || [];
      setFolders(
        nextFolders.length
          ? nextFolders
          : [
              {
                path: "INBOX",
                name: "Inbox",
                kind: "inbox",
                total: 0,
                unread: 0,
              },
            ],
      );
      setLabels(data.labels || []);
      setListError(data.error || "");
    } catch (err) {
      setListError(mailboxError(err));
      setConfig((c) => ({ ...c, configured: false, needsSetup: true }));
      setFolders([
        {
          path: "INBOX",
          name: "Inbox",
          kind: "inbox",
          total: 0,
          unread: 0,
        },
      ]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const finishMailboxConnected = async (email?: string) => {
    setSetupPass("");
    setSetupOk("Mailbox connected. Loading inbox…");
    setSetupError("");
    setConfig((c) => ({
      ...c,
      configured: true,
      needsSetup: false,
      email: email || c.email || setupUser.trim(),
    }));
    setListError("");
    setPage(1);
    setFolder("INBOX");
    await loadFolders();
    setReloadToken((n) => n + 1);
  };

  /** Use IMAP_* already set in the Node hosting panel (no credentials API needed). */
  const connectWithServerEnv = async () => {
    setSetupSaving(true);
    setSetupError("");
    setSetupOk("Checking server mailbox password…");
    try {
      const cfg = await api<{
        email: string;
        configured: boolean;
        needsSetup?: boolean;
      }>("/mailbox/config");
      if (!cfg.configured) {
        throw new Error(
          "Server still has no mailbox password. In the Node app panel click SAVE, then Restart the app. Confirm IMAP_USER and IMAP_PASS are set.",
        );
      }
      const foldersData = await api<{
        folders: Folder[];
        labels: Folder[];
        error?: string;
      }>("/mailbox/folders");
      if (foldersData.error) {
        throw new Error(foldersData.error);
      }
      await finishMailboxConnected(cfg.email);
    } catch (err) {
      setSetupOk("");
      setSetupError(
        err instanceof Error
          ? err.message
          : "Could not connect with the server password.",
      );
      setConfig((c) => ({ ...c, configured: false, needsSetup: true }));
    } finally {
      setSetupSaving(false);
    }
  };

  const saveMailboxSetup = async () => {
    setSetupSaving(true);
    setSetupError("");
    setSetupOk("");
    try {
      await api<{ ok: boolean; configured?: boolean }>("/mailbox/credentials", {
        method: "PUT",
        body: JSON.stringify({
          user: setupUser.trim(),
          pass: setupPass,
          host: setupHost.trim() || "palmpizzakitchen.com",
          name: config.name || "Palm Pizza Kitchen",
          imapIp: "68.65.123.100",
        }),
      });
      await finishMailboxConnected(setupUser.trim());
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not save mailbox password.";
      // Live host may not have PUT /credentials yet — fall back to IMAP_* env.
      if (/404|not found|Cannot PUT/i.test(msg)) {
        setSetupOk("Save API missing — trying server environment password…");
        try {
          const cfg = await api<{
            email: string;
            configured: boolean;
          }>("/mailbox/config");
          if (cfg.configured) {
            const foldersData = await api<{ error?: string }>(
              "/mailbox/folders",
            );
            if (!foldersData.error) {
              await finishMailboxConnected(cfg.email);
              return;
            }
            throw new Error(foldersData.error || "Mailbox folders failed.");
          }
          throw new Error(
            "IMAP_PASS is set in the panel, but the app has not loaded it yet. Click SAVE in the Node app settings, Restart the application, wait 10 seconds, then press “Use server password”.",
          );
        } catch (fallbackErr) {
          setSetupOk("");
          setSetupError(
            fallbackErr instanceof Error ? fallbackErr.message : msg,
          );
        }
        return;
      }
      setSetupError(msg);
    } finally {
      setSetupSaving(false);
    }
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ messages: MailRow[]; total: number; folder?: string; error?: string }>(
        `/mailbox/messages?folder=${encodeURIComponent(folder)}&q=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}&page=${page}&pageSize=200`,
      );
      setRows(data.messages || []);
      setTotal(data.total || 0);
      setListError(data.error || "");
    } catch (err) {
      setListError(mailboxError(err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [folder, query, filter, page, reloadToken]);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQuery(qInput);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const openMessage = async (row: MailRow) => {
    clearPreview();
    setSelected(row);
    setMobilePane("read");
    setDetailLoading(true);
    try {
      const data = await api<{ message: MailDetail }>(
        `/mailbox/messages/${row.uid}?folder=${encodeURIComponent(row.folder)}`,
      );
      setDetail(data.message);
      setRows((prev) =>
        prev.map((item) =>
          item.uid === row.uid ? { ...item, unseen: false } : item,
        ),
      );
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Could not open message.");
    } finally {
      setDetailLoading(false);
    }
  };

  const selectedIndex = rows.findIndex((r) => r.uid === selected?.uid);

  const goRel = (delta: number) => {
    const next = rows[selectedIndex + delta];
    if (next) void openMessage(next);
  };

  const patchFlags = async (opts: {
    seen?: boolean;
    flagged?: boolean;
    deleted?: boolean;
  }) => {
    if (!selected) return;
    await api(`/mailbox/messages/${selected.uid}/flags`, {
      method: "POST",
      body: JSON.stringify({ folder: selected.folder, ...opts }),
    });
    if (opts.deleted) {
      setRows((prev) => prev.filter((r) => r.uid !== selected.uid));
      setSelected(null);
      setDetail(null);
      setMobilePane("list");
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.uid === selected.uid
          ? {
              ...r,
              flagged: opts.flagged ?? r.flagged,
              unseen: opts.seen === false ? true : opts.seen === true ? false : r.unseen,
            }
          : r,
      ),
    );
    if (opts.flagged !== undefined && selected) {
      setSelected({ ...selected, flagged: opts.flagged });
    }
  };

  const moveTo = async (to: string) => {
    if (!selected) return;
    await api(`/mailbox/messages/${selected.uid}/move`, {
      method: "POST",
      body: JSON.stringify({ from: selected.folder, to }),
    });
    setRows((prev) => prev.filter((r) => r.uid !== selected.uid));
    setSelected(null);
    setDetail(null);
    await loadFolders().catch(() => null);
  };

  const downloadAtt = async (index: number, filename: string) => {
    if (!selected) return;
    const { blob } = await apiDownload(
      `/mailbox/messages/${selected.uid}/attachments/${index}?folder=${encodeURIComponent(selected.folder)}&download=1`,
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openAtt = async (att: MailDetail["attachments"][number]) => {
    if (!selected) return;
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const { blob } = await apiDownload(
        `/mailbox/messages/${selected.uid}/attachments/${att.index}?folder=${encodeURIComponent(selected.folder)}`,
      );
      const type =
        blob.type && blob.type !== "application/octet-stream"
          ? blob.type
          : att.contentType || "application/octet-stream";
      const typed = type !== blob.type ? new Blob([blob], { type }) : blob;
      const url = URL.createObjectURL(typed);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = url;
      setPreview({
        url,
        name: att.filename,
        type,
        kind: previewKind(att.filename, type),
      });
    } catch (err) {
      setPreviewError(
        err instanceof Error ? err.message : "Could not open this file.",
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const send = async (
    draft: ComposeDraft & {
      html?: string;
      attachments?: {
        filename: string;
        content: string;
        contentType: string;
        encoding: string;
      }[];
    },
    saveDraft = false,
  ) => {
    setSending(true);
    setComposeError("");
    try {
      await api("/mailbox/send", {
        method: "POST",
        body: JSON.stringify({
          to: draft.to,
          cc: draft.cc,
          bcc: draft.bcc,
          subject: draft.subject,
          text: draft.text || htmlToText(draft.html || ""),
          html: draft.html,
          attachments: draft.attachments,
          inReplyTo: draft.inReplyTo,
          references: draft.references,
          saveDraft,
        }),
      });
      setCompose(null);
      await loadList();
      await loadFolders().catch(() => null);
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(false);
    }
  };

  const addLabel = async () => {
    if (!labelName.trim()) return;
    try {
      await api("/mailbox/folders", {
        method: "POST",
        body: JSON.stringify({ name: labelName.trim() }),
      });
      setLabelName("");
      setAddingLabel(false);
      await loadFolders();
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Could not add label.");
    }
  };

  const trashPath =
    resolveFolderPath("trash", "INBOX.Trash", folders);
  const spamPath = resolveFolderPath("junk", "INBOX.Junk", folders);

  const folderNav = useMemo(() => {
    return MAIL_NAV.map((item) => {
      const path = resolveFolderPath(item.kind, item.fallback, folders);
      const match =
        folders.find((f) => f.path === path) ||
        folders.find((f) => f.kind === item.kind);
      return {
        path,
        name: item.name,
        kind: item.kind,
        total: match?.total || 0,
        unread: match?.unread || 0,
      } satisfies Folder;
    });
  }, [folders]);

  const displayName = config.name || "Palm Pizza Kitchen";
  const displayEmail = config.email || "info@palmpizzakitchen.com";
  const activeNav = folderNav.find((item) => item.path === folder);
  const headerTitle =
    activeNav?.name ||
    currentFolder?.name ||
    folder.split(".").pop() ||
    "Inbox";
  const headerUnread = activeNav?.unread || currentFolder?.unread || 0;

  return (
    <AdminShell>
      <div className="lg:-mx-8 lg:-mt-6 xl:-mx-8">
        <div className="flex min-h-[calc(100dvh-5.5rem)] overflow-hidden rounded-none bg-[#eef2f7] text-slate-800 lg:min-h-[calc(100dvh-4.25rem)] lg:rounded-tl-3xl">
          <aside className="hidden w-[236px] shrink-0 flex-col bg-[#1c2430] p-4 lg:flex">
            <div className="mb-4 flex items-center gap-3 px-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3b82f6] text-sm font-bold text-white">
                {initials(displayName, displayEmail)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">
                  {displayName}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {displayEmail}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setCompose(emptyDraft())
              }
              className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3b82f6] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(59,130,246,0.35)] hover:bg-[#2563eb]"
            >
              <span className="text-lg leading-none">+</span> New Message
            </button>
            <nav className="overflow-hidden rounded-lg border border-white/10">
              {folderNav.map((item) => {
                const active = folder === item.path;
                return (
                  <button
                    key={item.kind}
                    type="button"
                    onClick={() => {
                      setFolder(item.path);
                      setPage(1);
                      setSelected(null);
                      setDetail(null);
                      setMobilePane("list");
                    }}
                    className={`flex w-full items-center gap-3 border-b border-white/10 px-4 py-3.5 text-left text-[15px] last:border-b-0 ${
                      active
                        ? "bg-[#1c2430] font-semibold text-[#3b82f6]"
                        : "text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <MailFolderIcon
                      kind={item.kind}
                      className={`h-5 w-5 ${active ? "text-[#3b82f6]" : "text-slate-200"}`}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    {item.unread > 0 ? (
                      <span className={`text-[11px] ${active ? "text-[#3b82f6]" : "text-slate-500"}`}>
                        {item.unread}
                      </span>
                    ) : item.total > 0 ? (
                      <span className="text-[11px] text-slate-500">{item.total}</span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
            {labels.length > 0 || addingLabel ? (
              <p className="mt-5 mb-2 px-2 text-[10px] font-bold tracking-[0.16em] text-slate-500 uppercase">
                Labels
              </p>
            ) : null}
            <div className="space-y-0.5">
              {labels
                .filter((item) => !MAIL_NAV.some((nav) => nav.kind === item.kind))
                .map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    setFolder(item.path);
                    setPage(1);
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                    folder === item.path
                      ? "font-bold text-[#3b82f6]"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: item.color || "#3b82f6" }}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="text-[11px] text-slate-500">{item.total}</span>
                </button>
              ))}
              {addingLabel ? (
                <div className="flex gap-1 px-1 pt-1">
                  <input
                    value={labelName}
                    onChange={(e) => setLabelName(e.target.value)}
                    placeholder="Label name"
                    className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => void addLabel()}
                    className="rounded-lg bg-[#3b82f6] px-2 text-xs font-bold text-white"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingLabel(true)}
                  className="px-3 py-2 text-left text-xs font-bold text-[#3b82f6]"
                >
                  + Add Labels
                </button>
              )}
            </div>
          </aside>

          <section
            className={`flex w-full flex-col border-r border-slate-200/80 bg-white lg:w-[360px] lg:shrink-0 ${
              mobilePane === "read" ? "hidden lg:flex" : "flex"
            }`}
          >
            <div className="border-b border-slate-100 px-4 py-4">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    {headerTitle}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {total} Messages
                    {headerUnread ? ` • ${headerUnread} Unread` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCompose(emptyDraft())
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3b82f6] text-lg font-bold text-white lg:hidden"
                >
                  +
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  placeholder="Search mail"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#3b82f6]"
                />
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600"
                >
                  <option value="all">Current</option>
                  <option value="unread">Unread</option>
                  <option value="starred">Starred</option>
                </select>
              </div>
              <div className="mt-3 flex gap-1 overflow-x-auto lg:hidden">
                {folderNav.map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    onClick={() => {
                      setFolder(item.path);
                      setPage(1);
                      setSelected(null);
                      setDetail(null);
                    }}
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
                      folder === item.path
                        ? "bg-[#3b82f6] text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <p className="px-4 py-10 text-center text-sm font-semibold text-slate-400">
                  Loading mail…
                </p>
              ) : config.needsSetup ||
                (!config.configured && listError) ||
                /IMAP_PASS|password is missing|Mailbox password/i.test(
                  listError,
                ) ? (
                <div className="px-4 py-8">
                  <p className="text-center text-sm font-bold text-slate-800">
                    Connect shop mailbox
                  </p>
                  <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">
                    You already set <strong>IMAP_PASS</strong> in the Node app
                    panel. Click <strong>SAVE</strong> there,{" "}
                    <strong>Restart</strong> the app, then use the button below.
                  </p>
                  <div className="mx-auto mt-5 max-w-sm space-y-3 text-left">
                    {setupError ? (
                      <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                        {setupError}
                      </p>
                    ) : null}
                    {setupOk ? (
                      <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                        {setupOk}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      disabled={setupSaving}
                      onClick={() => void connectWithServerEnv()}
                      className="w-full rounded-xl bg-[#3b82f6] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {setupSaving
                        ? "Connecting…"
                        : "Use server password (IMAP_PASS)"}
                    </button>
                    <p className="pt-2 text-center text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                      Or save password via API
                    </p>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-600">
                        Mailbox email
                      </label>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                        value={setupUser}
                        onChange={(e) => setSetupUser(e.target.value)}
                        autoComplete="username"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-600">
                        Mailbox password
                      </label>
                      <input
                        type="password"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                        value={setupPass}
                        onChange={(e) => setSetupPass(e.target.value)}
                        placeholder="Email account password"
                        autoComplete="current-password"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-600">
                        Mail host
                      </label>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                        value={setupHost}
                        onChange={(e) => setSetupHost(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={setupSaving || !setupPass.trim()}
                      onClick={() => void saveMailboxSetup()}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-60"
                    >
                      {setupSaving ? "Connecting…" : "Save & connect mailbox"}
                    </button>
                  </div>
                </div>
              ) : listError && !rows.length ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-semibold leading-relaxed text-red-500">
                    {listError}
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadFolders()}
                    className="mt-3 rounded-xl bg-[#3b82f6] px-4 py-2 text-xs font-bold text-white"
                  >
                    Try again
                  </button>
                </div>
              ) : !rows.length ? (
                <p className="px-4 py-10 text-center text-sm font-semibold text-slate-400">
                  No messages in {headerTitle}.
                </p>
              ) : (
                rows.map((row) => {
                  const active = selected?.uid === row.uid;
                  return (
                    <button
                      key={`${row.folder}-${row.uid}`}
                      type="button"
                      onClick={() => void openMessage(row)}
                      className={`relative flex w-full gap-3 border-b border-slate-100 px-4 py-3.5 text-left ${
                        active ? "bg-[#eff6ff]" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      {active ? (
                        <span className="absolute inset-y-0 left-0 w-1 bg-[#3b82f6]" />
                      ) : null}
                      {row.unseen ? (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#3b82f6]" />
                      ) : (
                        <span className="mt-2 h-2 w-2 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`truncate text-sm ${
                              row.unseen
                                ? "font-extrabold text-slate-900"
                                : "font-semibold text-slate-800"
                            }`}
                          >
                            {row.subject}
                          </p>
                          <p className="shrink-0 text-[11px] font-semibold text-slate-400">
                            {formatListDate(row.date)}
                          </p>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {row.from.name || row.from.email}
                          {row.preview ? ` - ${row.preview}` : ""}
                        </p>
                        {row.attachments?.length ? (
                          <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">
                            📎 {row.attachments[0].filename}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            {total > rows.length ? (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs font-bold text-slate-500">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span>
                  Page {page} · {total} mail
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>

          <section
            className={`min-w-0 flex-1 flex-col bg-[#f8fafc] ${
              mobilePane === "list" ? "hidden lg:flex" : "flex"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-sm font-bold text-slate-500 lg:hidden"
                  onClick={() => setMobilePane("list")}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => goRel(-1)}
                  className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                >
                  ‹
                </button>
                <span className="text-xs font-bold text-slate-500">
                  {selectedIndex >= 0 ? selectedIndex + 1 : 0} of {rows.length || total}
                </span>
                <button
                  type="button"
                  onClick={() => goRel(1)}
                  className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                >
                  ›
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Print"
                  onClick={() => window.print()}
                  className="rounded-lg px-2 py-1.5 text-slate-500 hover:bg-slate-100"
                >
                  🖨️
                </button>
                <button
                  type="button"
                  title="Delete"
                  disabled={!selected}
                  onClick={() => void moveTo(trashPath).catch(() => patchFlags({ deleted: true }))}
                  className="rounded-lg px-2 py-1.5 text-slate-500 hover:bg-red-50 hover:text-red-500"
                >
                  🗑️
                </button>
              </div>
            </div>

            {!selected ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm font-semibold text-slate-400">
                Choose a message to read it here.
              </div>
            ) : detailLoading || !detail ? (
              <p className="p-8 text-sm font-semibold text-slate-400">
                Opening message…
              </p>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dbeafe] text-sm font-bold text-[#1d4ed8]">
                      {initials(detail.from.name, detail.from.email)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">
                        {detail.from.name || detail.from.email}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        From: {detail.from.email}
                        {detail.to?.length ? `  To: ${detail.to.join(", ")}` : "  To: Me"}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-semibold text-slate-400">
                      {formatFullDate(detail.date)}
                    </p>
                    <div className="mt-2 flex justify-end gap-1">
                      <button
                        type="button"
                        title="Star"
                        onClick={() =>
                          void patchFlags({ flagged: !selected.flagged })
                        }
                        className={`rounded-lg px-2 py-1 ${
                          selected.flagged ? "text-amber-500" : "text-slate-400"
                        }`}
                      >
                        ★
                      </button>
                      <button
                        type="button"
                        title="Reply"
                        onClick={() =>
                          setCompose(
                            emptyDraft({
                              to: detail.from.email,
                              subject: detail.subject.startsWith("Re:")
                                ? detail.subject
                                : `Re: ${detail.subject}`,
                              text: quote(detail),
                              html: `<p></p><p>On ${formatFullDate(detail.date)}, ${detail.from.name || detail.from.email} wrote:</p><blockquote style="border-left:3px solid #ccc;padding-left:8px;color:#555">${detail.html || quote(detail).replace(/\n/g, "<br/>")}</blockquote>`,
                              inReplyTo: detail.messageId,
                              references: [detail.references, detail.messageId]
                                .filter(Boolean)
                                .join(" "),
                            }),
                          )
                        }
                        className="rounded-lg px-2 py-1 text-slate-500 hover:bg-white"
                      >
                        ↩
                      </button>
                      <button
                        type="button"
                        title="Forward"
                        onClick={() =>
                          setCompose(
                            emptyDraft({
                              subject: detail.subject.startsWith("Fwd:")
                                ? detail.subject
                                : `Fwd: ${detail.subject}`,
                              text: quote(detail),
                              html: `<p></p><p>Forwarded message:</p><blockquote style="border-left:3px solid #ccc;padding-left:8px;color:#555">${detail.html || quote(detail).replace(/\n/g, "<br/>")}</blockquote>`,
                            }),
                          )
                        }
                        className="rounded-lg px-2 py-1 text-slate-500 hover:bg-white"
                      >
                        ↪
                      </button>
                      <button
                        type="button"
                        title="Spam"
                        onClick={() => void moveTo(spamPath)}
                        className="rounded-lg px-2 py-1 text-slate-400 hover:text-red-500"
                      >
                        ⚠
                      </button>
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {detail.subject}
                </h2>

                {detail.html ? (
                  <iframe
                    title="Email"
                    sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                    srcDoc={`<base target="_blank" /><style>body{font-family:Nunito,Arial,sans-serif;color:#1e293b;line-height:1.6;margin:0;padding:8px 0}img{max-width:100%;height:auto}a{color:#2563eb}</style>${detail.html}`}
                    className="mt-6 min-h-[220px] w-full rounded-xl bg-white"
                    style={{ height: "420px" }}
                  />
                ) : (
                  <pre className="mt-6 whitespace-pre-wrap font-[family-name:var(--font-nunito)] text-sm leading-relaxed text-slate-700">
                    {detail.text || "This message has no text."}
                  </pre>
                )}

                {detail.attachments?.length ? (
                  <div className="mt-8">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-extrabold tracking-wide text-slate-400 uppercase">
                        Attachments
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {detail.attachments.map((att) => {
                        const kind = previewKind(att.filename, att.contentType);
                        const ext = fileExt(att.filename, att.contentType);
                        return (
                          <div
                            key={att.index}
                            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                          >
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10px] font-extrabold ${
                                kind === "pdf"
                                  ? "bg-red-50 text-red-500"
                                  : kind === "image"
                                    ? "bg-sky-50 text-sky-600"
                                    : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {ext}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-slate-800">
                                {att.filename}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {fileSize(att.size)} · {ext}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => void openAtt(att)}
                              className="rounded-lg bg-[#3b82f6] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#2563eb]"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => void downloadAtt(att.index, att.filename)}
                              className="rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100"
                            >
                              Save
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {previewLoading ? (
                      <p className="mt-3 text-sm font-semibold text-slate-400">
                        Opening file…
                      </p>
                    ) : null}
                    {previewError ? (
                      <p className="mt-3 text-sm font-semibold text-red-500">
                        {previewError}
                      </p>
                    ) : null}
                    {preview ? (
                      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
                          <p className="min-w-0 truncate text-sm font-bold text-slate-800">
                            {preview.name}
                          </p>
                          <div className="flex shrink-0 items-center gap-2">
                            <a
                              href={preview.url}
                              download={preview.name}
                              className="rounded-lg px-2 py-1 text-[11px] font-bold text-[#3b82f6]"
                            >
                              Save
                            </a>
                            <button
                              type="button"
                              onClick={clearPreview}
                              className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                        {preview.kind === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={preview.url}
                            alt={preview.name}
                            className="max-h-[70vh] w-full bg-slate-50 object-contain p-4"
                          />
                        ) : preview.kind === "pdf" || preview.kind === "text" ? (
                          <iframe
                            title={preview.name}
                            src={preview.url}
                            className="h-[70vh] w-full bg-white"
                          />
                        ) : (
                          <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                            This file type cannot be previewed here. Use Save to
                            open it on your computer.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>

      {compose ? (
        <GmailCompose
          fromName={displayName}
          fromEmail={displayEmail}
          initial={compose}
          sending={sending}
          error={composeError}
          onClose={() => {
            setCompose(null);
            setComposeError("");
          }}
          onSend={(payload, draft) => void send(payload, draft)}
        />
      ) : null}
    </AdminShell>
  );
}

function GmailCompose({
  fromName,
  fromEmail,
  initial,
  sending,
  error,
  onClose,
  onSend,
}: {
  fromName: string;
  fromEmail: string;
  initial: ComposeDraft;
  sending: boolean;
  error: string;
  onClose: () => void;
  onSend: (
    payload: ComposeDraft & {
      html?: string;
      attachments?: {
        filename: string;
        content: string;
        contentType: string;
        encoding: string;
      }[];
    },
    saveDraft?: boolean,
  ) => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [to, setTo] = useState(initial.to);
  const [cc, setCc] = useState(initial.cc);
  const [bcc, setBcc] = useState(initial.bcc || "");
  const [subject, setSubject] = useState(initial.subject);
  const [showCc, setShowCc] = useState(Boolean(initial.cc));
  const [showBcc, setShowBcc] = useState(Boolean(initial.bcc));
  const [showFormat, setShowFormat] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [files, setFiles] = useState<
    { filename: string; content: string; contentType: string; encoding: string }[]
  >([]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.innerHTML =
        initial.html ||
        (initial.text || "").replace(/\n/g, "<br/>") ||
        "";
    }
  }, [initial]);

  const run = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    bodyRef.current?.focus();
  };

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      const content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const raw = String(reader.result || "");
          resolve(raw.split(",")[1] || "");
        };
        reader.readAsDataURL(file);
      });
      next.push({
        filename: file.name,
        content,
        contentType: file.type || "application/octet-stream",
        encoding: "base64",
      });
    }
    setFiles(next);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = (draft = false) => {
    const html = bodyRef.current?.innerHTML || "";
    onSend(
      {
        ...initial,
        to,
        cc,
        bcc,
        subject,
        html,
        text: htmlToText(html),
        attachments: files,
      },
      draft,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/25 p-0 sm:p-4">
      <div
        className={`flex w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_8px_40px_rgba(15,23,42,0.28)] sm:rounded-2xl ${
          expanded
            ? "h-[min(92vh,900px)] max-w-4xl"
            : minimized
              ? "h-12 max-w-xl"
              : "h-[min(78vh,640px)] max-w-xl"
        }`}
      >
        <div className="flex items-center justify-between bg-[#eaf0fb] px-4 py-2.5">
          <p className="text-sm font-semibold text-[#1a237e]">New Message</p>
          <div className="flex items-center gap-1 text-[#5f6368]">
            <button
              type="button"
              aria-label="Minimize"
              className="rounded px-2 py-0.5 text-lg leading-none hover:bg-black/5"
              onClick={() => setMinimized((v) => !v)}
            >
              –
            </button>
            <button
              type="button"
              aria-label="Expand"
              className="rounded px-2 py-0.5 text-sm hover:bg-black/5"
              onClick={() => {
                setExpanded((v) => !v);
                setMinimized(false);
              }}
            >
              ⛶
            </button>
            <button
              type="button"
              aria-label="Close"
              className="rounded px-2 py-0.5 text-lg leading-none hover:bg-black/5"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        {!minimized && (
          <>
            <div className="border-b border-slate-200 px-4 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-slate-500">From</span>
                <p className="min-w-0 flex-1 truncate text-slate-800">
                  {fromName} &lt;{fromEmail}&gt;
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 text-sm">
              <span className="w-12 shrink-0 text-slate-500">To</span>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="min-w-0 flex-1 bg-transparent outline-none"
                placeholder="Recipients"
              />
              <button
                type="button"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                onClick={() => setShowCc((v) => !v)}
              >
                Cc
              </button>
              <button
                type="button"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                onClick={() => setShowBcc((v) => !v)}
              >
                Bcc
              </button>
            </div>
            {showCc ? (
              <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 text-sm">
                <span className="w-12 shrink-0 text-slate-500">Cc</span>
                <input
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </div>
            ) : null}
            {showBcc ? (
              <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 text-sm">
                <span className="w-12 shrink-0 text-slate-500">Bcc</span>
                <input
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </div>
            ) : null}
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 text-sm">
              <span className="w-12 shrink-0 text-slate-500">Subject</span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="min-w-0 flex-1 bg-transparent outline-none"
                placeholder="Subject"
              />
            </div>
            <div
              ref={bodyRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-slate-800 outline-none"
            />
            {files.length ? (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-2">
                {files.map((file, i) => (
                  <span
                    key={`${file.filename}-${i}`}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600"
                  >
                    📎 {file.filename}
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            {error ? (
              <p className="px-4 pb-1 text-xs font-semibold text-red-500">
                {error}
              </p>
            ) : null}
            {showFormat ? (
              <div className="mx-3 mb-2 flex flex-wrap items-center gap-1 rounded-xl bg-[#eaf0fb] px-2 py-1.5 text-slate-700">
                <button type="button" className="rounded px-2 py-1 text-xs font-bold" onClick={() => run("bold")}>
                  B
                </button>
                <button type="button" className="rounded px-2 py-1 text-xs italic" onClick={() => run("italic")}>
                  I
                </button>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-xs underline"
                  onClick={() => run("underline")}
                >
                  U
                </button>
                <button type="button" className="rounded px-2 py-1 text-xs" onClick={() => run("insertUnorderedList")}>
                  • List
                </button>
                <button type="button" className="rounded px-2 py-1 text-xs" onClick={() => run("justifyLeft")}>
                  Left
                </button>
                <button type="button" className="rounded px-2 py-1 text-xs" onClick={() => run("justifyCenter")}>
                  Center
                </button>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-xs"
                  onClick={() => {
                    const url = window.prompt("Link URL");
                    if (url) run("createLink", url);
                  }}
                >
                  Link
                </button>
              </div>
            ) : null}
            <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-2">
              <button
                type="button"
                disabled={sending || !to.trim()}
                onClick={() => submit(false)}
                className="rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send"}
              </button>
              <button
                type="button"
                title="Formatting"
                className="rounded-lg px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100"
                onClick={() => setShowFormat((v) => !v)}
              >
                Aa
              </button>
              <button
                type="button"
                title="Attach"
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                onClick={() => fileRef.current?.click()}
              >
                📎
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => void addFiles(e.target.files)}
              />
              <button
                type="button"
                disabled={sending}
                className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100"
                onClick={() => submit(true)}
              >
                Draft
              </button>
              <button
                type="button"
                title="Discard"
                className="ml-auto rounded-lg px-2 py-1 text-slate-500 hover:bg-red-50"
                onClick={onClose}
              >
                🗑️
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
