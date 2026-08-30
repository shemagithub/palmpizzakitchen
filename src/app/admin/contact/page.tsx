"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  AdminAlert,
  AdminCard,
  AdminHelpTip,
  AdminPageHeader,
  AdminSkeleton,
} from "@/components/admin/AdminUI";
import { api } from "@/lib/api";

type ContactMessage = {
  id: number;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

function formatWhen(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminContactPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ messages: ContactMessage[] }>("/contact");
      setMessages(data.messages || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = messages.filter((row) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      row.name.toLowerCase().includes(q) ||
      row.email.toLowerCase().includes(q) ||
      row.message.toLowerCase().includes(q)
    );
  });

  const remove = async (row: ContactMessage) => {
    const ok = window.confirm(`Delete the message from ${row.name}?`);
    if (!ok) return;
    setBusyId(row.id);
    try {
      await api(`/contact/${row.id}`, { method: "DELETE" });
      if (openId === row.id) setOpenId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Website"
        title="Contact messages"
        subtitle="Name, email, and message from the Contact page form. New submissions also go to info@palmpizzakitchen.com."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-2xl bg-pam-sand px-4 py-2.5 text-sm font-bold text-pam-ink"
          >
            Refresh
          </button>
        }
      />
      <AdminHelpTip>
        When someone taps Send message on the website, it is stored here so the
        kitchen can reply.
      </AdminHelpTip>

      {error && <AdminAlert>{error}</AdminAlert>}

      <div className="mb-4">
        <input
          className="input-field max-w-full rounded-2xl sm:max-w-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, or message"
        />
      </div>

      {loading ? (
        <AdminSkeleton rows={4} />
      ) : filtered.length === 0 ? (
        <AdminCard className="p-6 text-sm text-pam-muted">
          No contact messages yet. Send a test from the Contact page to see it
          here.
        </AdminCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const open = openId === row.id;
            return (
              <AdminCard key={row.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setOpenId(open ? null : row.id)}
                  >
                    <p className="font-bold text-pam-ink">{row.name}</p>
                    <p className="text-sm text-pam-muted">{row.email}</p>
                    <p className="mt-1 text-[11px] text-pam-muted">
                      {formatWhen(row.createdAt)}
                    </p>
                    {!open && (
                      <p className="mt-2 line-clamp-2 text-sm text-pam-ink/80">
                        {row.message}
                      </p>
                    )}
                  </button>
                  <div className="flex gap-2">
                    <a
                      href={`mailto:${row.email}`}
                      className="rounded-xl bg-pam-sand px-3 py-2 text-xs font-bold text-pam-ink"
                    >
                      Reply
                    </a>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void remove(row)}
                      className="rounded-xl px-3 py-2 text-xs font-bold text-pam-red disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {open && (
                  <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-pam-sand/70 p-4 text-sm leading-relaxed text-pam-ink">
                    {row.message}
                  </p>
                )}
              </AdminCard>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
