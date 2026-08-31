"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import OrderDetailModal from "@/components/admin/OrderDetailModal";
import {
  AdminAlert,
  AdminCard,
  AdminHelpTip,
  AdminPageHeader,
  AdminSkeleton,
} from "@/components/admin/AdminUI";
import { statusTone } from "@/data/admin";
import { formatPrice } from "@/data/menu";
import { api } from "@/lib/api";
import {
  googleMapsUrl,
  hasLiveLocation,
  type OrderNotesMeta,
} from "@/lib/orderLocation";
import { promoCodesFromNotes } from "@/lib/offers";

type OrderRow = {
  id: string;
  customer: string;
  email?: string;
  items: string;
  total: number;
  status: string;
  kitchenLabel?: string;
  time: string;
  phone: string;
  address?: string;
  paymentMethod?: string;
  paymentLabel?: string;
  paymentStatus?: string;
  fulfillment?: string;
  notes?: string;
  notesMeta?: OrderNotesMeta;
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "awaiting", label: "Awaiting payment" },
  { id: "paid", label: "Paid" },
  { id: "Pending", label: "Kitchen queue" },
  { id: "Preparing", label: "Preparing" },
  { id: "Out for delivery", label: "Out / pickup" },
  { id: "Delivered", label: "Done" },
  { id: "Cancelled", label: "Cancelled" },
] as const;

const FLOW = [
  "Pending",
  "Preparing",
  "Out for delivery",
  "Delivered",
] as const;

function paymentBadge(status?: string) {
  if (status === "paid") {
    return { label: "Paid", className: "bg-pam-basil text-white" };
  }
  if (status === "failed") {
    return { label: "Payment failed", className: "bg-pam-red text-white" };
  }
  return { label: "Awaiting payment", className: "bg-[#c45a12] text-white" };
}

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

export default function AdminOrdersPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "awaiting") params.set("payment", "pending");
      else if (filter === "paid") params.set("payment", "paid");
      else if (filter !== "all") params.set("status", filter);
      if (query.trim()) params.set("q", query.trim());
      const data = await api<{ orders: OrderRow[] }>(
        `/orders?${params.toString()}`,
      );
      setOrders(data.orders);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [filter, query]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), query ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [load, query]);

  const removeOrder = async (id: string) => {
    const ok = window.confirm(
      `Delete ${id}? This removes the order from the kitchen list and cannot be undone.`,
    );
    if (!ok) return;
    setDeletingId(id);
    try {
      await api(`/orders/${id}`, { method: "DELETE" });
      if (selectedId === id) setSelectedId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const advance = async (id: string, status: string) => {
    const i = FLOW.indexOf(status as (typeof FLOW)[number]);
    if (i < 0 || i >= FLOW.length - 1) return;
    try {
      const data = await api<{
        emailNotified?: boolean;
        emailSkipped?: string;
        status?: string;
      }>(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: FLOW[i + 1] }),
      });
      setError("");
      if (data.emailNotified) {
        setNotice(
          `Status → ${data.status || FLOW[i + 1]}. Customer was emailed.`,
        );
      } else if (data.emailSkipped === "no_email") {
        setNotice(
          `Status → ${data.status || FLOW[i + 1]}. No customer email on this order.`,
        );
      } else {
        setNotice(`Status → ${data.status || FLOW[i + 1]}.`);
      }
      await load();
    } catch (err) {
      setNotice("");
      setError(err instanceof Error ? err.message : "Update failed.");
    }
  };

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Daily work"
        title="Customer orders"
        subtitle="Live orders from checkout. Payment is checked against XentriPay, then kitchen status is separate - Paid does not mean the pizza is already out."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
          >
            Refresh list
          </button>
        }
      />

      <AdminHelpTip title="How to use orders" dismissKey="orders">
        Tap any order row to open the full details card. Use{" "}
        <strong>Advance</strong> for a quick status step, or{" "}
        <strong>Delete</strong> to remove an order from this list.
        Each status change emails the customer (when their email is on the
        order).
      </AdminHelpTip>

      {error && <AdminAlert>{error}</AdminAlert>}
      {notice && <AdminAlert tone="ok">{notice}</AdminAlert>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold transition ${
                filter === item.id
                  ? "bg-pam-red text-white"
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
          placeholder="Search order or customer…"
          className="input-field max-w-full rounded-2xl sm:max-w-xs"
        />
      </div>

      <AdminCard className="overflow-hidden">
        {loading ? (
          <div className="p-4">
            <AdminSkeleton rows={5} />
          </div>
        ) : (
          <div className="divide-y divide-pam-border">
            {orders.map((order) => {
              const pay = paymentBadge(order.paymentStatus);
              const canAdvance =
                order.paymentStatus === "paid" &&
                order.status !== "Delivered" &&
                order.status !== "Cancelled";
              const meta = order.notesMeta;
              const mapsHref =
                meta &&
                googleMapsUrl({
                  gps: meta.gps,
                  address: order.address,
                  area: meta.area,
                  landmark: meta.landmark,
                  place: meta.place,
                });
              const showMaps =
                mapsHref &&
                order.fulfillment !== "pickup" &&
                (hasLiveLocation(meta!, order.fulfillment) || order.address);
              return (
              <div
                key={order.id}
                className="grid gap-3 px-4 py-4 transition hover:bg-pam-sand/40 sm:px-5 md:grid-cols-[1fr_1.05fr_0.75fr_0.85fr_0.5fr_0.95fr] md:items-center"
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(order.id)}
                  className="min-w-0 text-left"
                >
                  <p className="text-sm font-bold text-pam-ink hover:text-pam-red">
                    {order.id}
                    {promoCodesFromNotes(order.notes).length ? (
                      <span className="ml-2 rounded-md bg-pam-gold/40 px-1.5 py-0.5 text-[10px] font-bold text-pam-ink align-middle">
                        PROMO
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-pam-muted">
                    {order.customer} · {order.phone}
                  </p>
                  <p className="mt-0.5 text-[11px] text-pam-muted">
                    {formatWhen(order.time)}
                    {order.email ? ` · ${order.email}` : ""} · Tap for details
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedId(order.id)}
                  className="text-left text-sm text-pam-ink/80 hover:text-pam-ink"
                >
                  <p>{order.items}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-pam-muted">
                    {order.fulfillment === "pickup" ? "Pickup" : "Delivery"}
                    {order.address ? ` · ${order.address}` : ""}
                    {meta?.gps && order.fulfillment !== "pickup" ? (
                      <span className="ml-1 font-bold text-pam-basil">
                        · Live GPS
                      </span>
                    ) : null}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedId(order.id)}
                  className="text-left"
                >
                  <p className="text-sm font-bold text-pam-ink">
                    {order.paymentLabel || order.paymentMethod || "-"}
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${pay.className}`}
                  >
                    {pay.label}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedId(order.id)}
                  className="w-fit text-left"
                >
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(order.status)}`}
                  >
                    {order.kitchenLabel || order.status}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedId(order.id)}
                  className="text-left text-sm font-bold hover:text-pam-red"
                >
                  {formatPrice(order.total)}
                </button>
                <div className="flex flex-wrap gap-2">
                  {showMaps ? (
                    <a
                      href={mapsHref!}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-xl bg-pam-basil px-3 py-2.5 text-xs font-bold text-white active:scale-[0.98]"
                      title={
                        meta?.gps
                          ? "Open live GPS location in Google Maps"
                          : "Open delivery address in Google Maps"
                      }
                    >
                      Maps
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void advance(order.id, order.status);
                    }}
                    disabled={!canAdvance}
                    title={
                      order.paymentStatus === "paid"
                        ? "Move kitchen status forward"
                        : "Pay first, then send to kitchen"
                    }
                    className="rounded-xl bg-pam-sand px-3 py-2.5 text-xs font-bold text-pam-ink active:scale-[0.98] disabled:opacity-40"
                  >
                    Advance
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeOrder(order.id);
                    }}
                    disabled={deletingId === order.id}
                    className="rounded-xl bg-pam-red/10 px-3 py-2.5 text-xs font-bold text-pam-red active:scale-[0.98] disabled:opacity-40"
                  >
                    {deletingId === order.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
              );
            })}
            {!orders.length && (
              <p className="px-5 py-10 text-center text-sm text-pam-muted">
                No orders found. When a customer checks out, the order will show
                here.
              </p>
            )}
          </div>
        )}
      </AdminCard>

      <OrderDetailModal
        orderId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={() => void load()}
      />
    </AdminShell>
  );
}
