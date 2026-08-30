"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BellIcon } from "@/components/icons";
import { formatPrice } from "@/data/menu";
import { api, getToken } from "@/lib/api";

const SEEN_KEY = "palm-admin-notif-seen";

type Notice = {
  id: string;
  type: "order" | "payment" | "message" | "customer" | "newsletter" | string;
  title: string;
  body: string;
  href: string;
  amount?: number;
  createdAt: string;
};

function loadSeen(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(SEEN_KEY) || "";
  } catch {
    return "";
  }
}

function saveSeen(iso: string) {
  try {
    window.localStorage.setItem(SEEN_KEY, iso);
  } catch {
    /* ignore */
  }
}

function isUnread(item: Notice, seenAt: string) {
  const t = new Date(item.createdAt).getTime();
  if (Number.isNaN(t)) return false;
  if (!seenAt) return Date.now() - t < 48 * 60 * 60 * 1000;
  return t > new Date(seenAt).getTime();
}

function timeAgo(value: string) {
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function typeLabel(type: string) {
  if (type === "order") return "Order";
  if (type === "payment") return "Payment";
  if (type === "message") return "Inbox";
  if (type === "customer") return "Customer";
  if (type === "newsletter") return "Email list";
  return "Update";
}

export default function AdminNotifications({
  tone = "light",
}: {
  tone?: "light" | "dark";
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [seenAt, setSeenAt] = useState("");
  const [highlightBefore, setHighlightBefore] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getToken()) return;
    try {
      const data = await api<{ notifications: Notice[] }>("/notifications");
      setItems(data.notifications || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSeenAt(loadSeen());
    void load();
    const timer = window.setInterval(() => void load(), 25000);
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (event.target instanceof Node && !el.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter((item) => isUnread(item, seenAt)).length;
  const badge = unread > 9 ? "9+" : String(unread);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        const previous = seenAt || loadSeen();
        setHighlightBefore(previous);
        const now = new Date().toISOString();
        saveSeen(now);
        setSeenAt(now);
        void load();
      }
      return next;
    });
  };

  const btnClass =
    tone === "dark"
      ? "relative flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/15"
      : "relative flex h-11 w-11 items-center justify-center rounded-xl bg-pam-sand text-pam-ink hover:bg-pam-gold-soft";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={
          unread
            ? `Notifications, ${unread} new`
            : "Notifications"
        }
        aria-expanded={open}
        onClick={toggle}
        className={btnClass}
      >
        <BellIcon className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-pam-red px-1 text-[10px] font-extrabold text-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-pam-border/80 bg-white shadow-[0_18px_40px_rgba(28,25,23,0.18)]">
          <div className="flex items-center justify-between border-b border-pam-border/70 px-4 py-3">
            <div>
              <p className="text-sm font-extrabold text-pam-ink">
                Notifications
              </p>
              <p className="text-[11px] font-semibold text-pam-muted">
                New orders, payments, and messages
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-[11px] font-bold text-pam-muted hover:bg-pam-sand hover:text-pam-ink"
            >
              Close
            </button>
          </div>
          <div className="max-h-[min(70vh,26rem)] overflow-y-auto overscroll-contain">
            {loading && !items.length ? (
              <p className="px-4 py-8 text-center text-sm font-semibold text-pam-muted">
                Loading…
              </p>
            ) : error && !items.length ? (
              <p className="px-4 py-8 text-center text-sm font-semibold text-pam-red">
                {error}
              </p>
            ) : !items.length ? (
              <p className="px-4 py-8 text-center text-sm font-semibold text-pam-muted">
                Nothing new yet. New orders will show up here.
              </p>
            ) : (
              items.map((item) => {
                const fresh = isUnread(item, highlightBefore);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block border-b border-pam-border/50 px-4 py-3 transition hover:bg-pam-sand/60 ${
                      fresh ? "bg-pam-gold-soft/50" : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[10px] font-extrabold tracking-wide text-pam-red uppercase">
                        {typeLabel(item.type)}
                      </p>
                      <p className="shrink-0 text-[10px] font-bold text-pam-muted">
                        {timeAgo(item.createdAt)}
                      </p>
                    </div>
                    <p className="mt-1 text-sm font-bold leading-snug text-pam-ink">
                      {item.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-pam-muted">
                      {item.body}
                      {item.amount
                        ? ` · ${formatPrice(item.amount)}`
                        : ""}
                    </p>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
