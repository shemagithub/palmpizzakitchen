"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  AdminAlert,
  AdminCard,
  AdminHelpTip,
  AdminPageHeader,
  AdminSkeleton,
} from "@/components/admin/AdminUI";
import { formatPrice } from "@/data/menu";
import { api } from "@/lib/api";

type Tx = {
  id: string;
  direction: "in" | "out";
  relatedId: string;
  reference: string;
  gatewayRef?: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  statusLabel: string;
  party: string;
  phone?: string;
  email?: string;
  note?: string;
  createdAt: string;
};

type Summary = {
  paidIn: number;
  paidOut: number;
  awaiting: number;
  count: number;
};

const TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "in", label: "Money in" },
  { id: "out", label: "Money out" },
] as const;

const STATUS_FILTERS = [
  { id: "all", label: "Any status" },
  { id: "paid", label: "Completed" },
  { id: "pending", label: "Pending" },
  { id: "failed", label: "Failed" },
] as const;

function formatWhen(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: string, direction: string) {
  const s = status.toLowerCase();
  if (s === "paid" || s === "completed" || s === "success" || s === "successful") {
    return "bg-pam-basil text-white";
  }
  if (s === "failed") return "bg-pam-red text-white";
  return direction === "out"
    ? "bg-pam-gold-soft text-pam-ink"
    : "bg-[#c45a12] text-white";
}

export default function AdminTransactionsPage() {
  const [type, setType] = useState<(typeof TYPE_FILTERS)[number]["id"]>("all");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Tx[]>([]);
  const [summary, setSummary] = useState<Summary>({
    paidIn: 0,
    paidOut: 0,
    awaiting: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type !== "all") params.set("type", type);
      if (status !== "all") params.set("status", status);
      if (query.trim()) params.set("q", query.trim());
      const data = await api<{ transactions: Tx[]; summary: Summary }>(
        `/transactions?${params.toString()}`,
      );
      setRows(data.transactions || []);
      setSummary(
        data.summary || { paidIn: 0, paidOut: 0, awaiting: 0, count: 0 },
      );
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load transactions.",
      );
    } finally {
      setLoading(false);
    }
  }, [type, status, query]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), query ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [load, query]);

  const refreshRow = async (row: Tx) => {
    setRefreshingId(row.id);
    setError("");
    try {
      if (row.direction === "in" && row.relatedId) {
        await api(
          `/payments/${encodeURIComponent(row.relatedId)}?reference=${encodeURIComponent(row.reference)}`,
        );
      } else if (row.direction === "out" && row.reference) {
        await api(`/payouts/${encodeURIComponent(row.reference)}/status`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh status.");
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Money"
        title="Transactions"
        subtitle="Every collection from checkout and every payout from this shop - live from MySQL and XentriPay references."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
          >
            Refresh
          </button>
        }
      />

      <AdminHelpTip title="How to read this list" dismissKey="transactions">
        <strong>Money in</strong> is a customer payment for an order.{" "}
        <strong>Money out</strong> is a payout you sent. Green means it
        finished. Orange means it is still waiting. Use Refresh status if a
        payment just completed.
      </AdminHelpTip>

      {error && <AdminAlert>{error}</AdminAlert>}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.35rem] bg-pam-basil px-4 py-4 text-white">
          <p className="text-[11px] font-bold tracking-wide uppercase text-white/70">
            Paid in
          </p>
          <p className="mt-1 font-[family-name:var(--font-oswald)] text-2xl">
            {formatPrice(summary.paidIn)}
          </p>
        </div>
        <div className="rounded-[1.35rem] bg-[#1a1512] px-4 py-4 text-white">
          <p className="text-[11px] font-bold tracking-wide uppercase text-white/70">
            Paid out
          </p>
          <p className="mt-1 font-[family-name:var(--font-oswald)] text-2xl">
            {formatPrice(summary.paidOut)}
          </p>
        </div>
        <div className="rounded-[1.35rem] bg-pam-gold-soft px-4 py-4 text-pam-ink">
          <p className="text-[11px] font-bold tracking-wide uppercase text-pam-muted">
            Still pending
          </p>
          <p className="mt-1 font-[family-name:var(--font-oswald)] text-2xl">
            {summary.awaiting}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setType(item.id)}
              className={`rounded-full px-3 py-2 text-xs font-bold ${
                type === item.id
                  ? "bg-pam-red text-white"
                  : "bg-white text-pam-ink ring-1 ring-pam-border"
              }`}
            >
              {item.label}
            </button>
          ))}
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatus(item.id)}
              className={`rounded-full px-3 py-2 text-xs font-bold ${
                status === item.id
                  ? "bg-pam-ink text-white"
                  : "bg-white text-pam-muted ring-1 ring-pam-border"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search order, name, phone, reference…"
          className="input-field max-w-full rounded-2xl lg:max-w-sm"
        />
      </div>

      <AdminCard className="overflow-hidden">
        {loading ? (
          <div className="p-4">
            <AdminSkeleton rows={6} />
          </div>
        ) : (
          <div className="divide-y divide-pam-border">
            {rows.map((row) => (
              <article key={row.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          row.direction === "in"
                            ? "bg-pam-basil/15 text-pam-basil"
                            : "bg-pam-red/10 text-pam-red"
                        }`}
                      >
                        {row.direction === "in" ? "Money in" : "Money out"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(row.status, row.direction)}`}
                      >
                        {row.statusLabel}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-bold text-pam-ink">
                      {row.party}
                    </p>
                    <p className="text-xs text-pam-muted">
                      {row.method}
                      {row.phone ? ` · ${row.phone}` : ""}
                      {row.relatedId ? ` · ${row.relatedId}` : ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-pam-muted">
                      {formatWhen(row.createdAt)} · {row.reference}
                      {row.gatewayRef ? ` · ${row.gatewayRef}` : ""}
                    </p>
                    {row.note && (
                      <p className="mt-1 text-xs text-pam-muted">{row.note}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-[family-name:var(--font-oswald)] text-xl ${
                        row.direction === "out" ? "text-pam-red" : "text-pam-ink"
                      }`}
                    >
                      {row.direction === "out" ? "−" : "+"}
                      {formatPrice(row.amount)}
                    </p>
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      {row.direction === "in" && row.relatedId && (
                        <Link
                          href="/admin/orders"
                          className="text-xs font-bold text-pam-red"
                        >
                          Open orders
                        </Link>
                      )}
                      {row.direction === "out" && (
                        <Link
                          href="/admin/payouts"
                          className="text-xs font-bold text-pam-red"
                        >
                          Open payouts
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => void refreshRow(row)}
                        disabled={refreshingId === row.id}
                        className="text-xs font-bold text-pam-ink disabled:opacity-50"
                      >
                        {refreshingId === row.id
                          ? "Checking…"
                          : "Refresh status"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {!rows.length && (
              <p className="px-5 py-10 text-center text-sm text-pam-muted">
                No transactions yet. Customer payments and payouts will show
                here.
              </p>
            )}
          </div>
        )}
      </AdminCard>
    </AdminShell>
  );
}
