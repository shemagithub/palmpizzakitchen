"use client";

import { useEffect, useState } from "react";
import { statusTone } from "@/data/admin";
import { formatPrice } from "@/data/menu";
import { api } from "@/lib/api";
import {
  googleMapsUrl,
  hasLiveLocation,
  type OrderNotesMeta,
} from "@/lib/orderLocation";
import {
  isPromoOrderLineName,
  promoCodesFromNotes,
  promoLineBadge,
} from "@/lib/offers";

export type OrderDetail = {
  id: string;
  customer: string;
  phone: string;
  address: string;
  paymentMethod: string;
  paymentLabel: string;
  paymentStatus?: string;
  kitchenLabel?: string;
  fulfillment?: string;
  email?: string;
  paidAt?: string | null;
  status: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes: string;
  notesMeta: OrderNotesMeta;
  time: string;
  updatedAt?: string;
  userId?: number | null;
  account: {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: string;
    memberSince?: string;
  } | null;
  guestCheckout: boolean;
  items: string;
  lineItems: {
    itemId?: string | null;
    name: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
};

const STATUSES = [
  "Pending",
  "Preparing",
  "Out for delivery",
  "Delivered",
  "Cancelled",
] as const;

function formatWhen(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type Props = {
  orderId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
};

export default function OrderDetailModal({
  orderId,
  onClose,
  onUpdated,
}: Props) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setError("");
      setNotice("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setNotice("");
    api<{ order: OrderDetail }>(`/orders/${encodeURIComponent(orderId)}`)
      .then((data) => {
        if (cancelled) return;
        setOrder(data.order);
        setStatus(data.order.status);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load order.");
        setOrder(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [orderId, onClose]);

  if (!orderId) return null;

  const saveStatus = async () => {
    if (!order || !status || status === order.status) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{ emailNotified?: boolean; emailSkipped?: string }>(
        `/orders/${encodeURIComponent(order.id)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
      );
      setOrder({ ...order, status });
      if (data.emailNotified) {
        setNotice("Status saved. Customer was emailed.");
      } else if (data.emailSkipped === "no_email") {
        setNotice("Status saved. No customer email on this order.");
      } else {
        setNotice("Status saved.");
      }
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setSaving(false);
    }
  };

  const deleteOrder = async () => {
    if (!order) return;
    const ok = window.confirm(
      `Delete ${order.id}? This cannot be undone.`,
    );
    if (!ok) return;
    setDeleting(true);
    setError("");
    try {
      await api(`/orders/${encodeURIComponent(order.id)}`, { method: "DELETE" });
      onUpdated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete order.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close order details"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-title"
        className="relative z-[91] flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-pam-border/80 bg-pam-sand/40 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.16em] text-pam-red uppercase">
              Order details
            </p>
            <h2
              id="order-detail-title"
              className="mt-1 truncate font-[family-name:var(--font-oswald)] text-2xl tracking-wide text-pam-ink"
            >
              {orderId}
            </h2>
            {order && (
              <p className="mt-1 text-xs text-pam-muted">
                Placed {formatWhen(order.time)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {loading && (
            <p className="py-10 text-center text-sm font-semibold text-pam-muted">
              Loading order… please wait
            </p>
          )}

          {error && (
            <div className="mb-4 rounded-2xl bg-pam-red/10 px-4 py-3 text-sm font-medium text-pam-red">
              Problem: {error}
            </div>
          )}

          {notice && !error && (
            <div className="mb-4 rounded-2xl bg-pam-basil/10 px-4 py-3 text-sm font-medium text-pam-basil">
              {notice}
            </div>
          )}

          {order && !loading && (
            <div className="space-y-4">
              {(() => {
                const mapsHref = googleMapsUrl({
                  gps: order.notesMeta.gps,
                  address: order.address,
                  area: order.notesMeta.area,
                  landmark: order.notesMeta.landmark,
                  place: order.notesMeta.place,
                });
                const live = hasLiveLocation(
                  order.notesMeta,
                  order.fulfillment,
                );
                if (!mapsHref || order.fulfillment === "pickup") return null;
                return (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pam-basil/30 bg-pam-basil/10 px-4 py-3.5 transition hover:bg-pam-basil/15"
                  >
                    <div>
                      <p className="text-sm font-bold text-pam-ink">
                        {live ? "Open live customer location" : "Open in Google Maps"}
                      </p>
                      <p className="mt-0.5 text-xs text-pam-muted">
                        {live
                          ? order.notesMeta.gps
                          : order.address || "Delivery address"}
                        {order.notesMeta.accuracyMeters
                          ? ` · ±${order.notesMeta.accuracyMeters}m`
                          : ""}
                      </p>
                    </div>
                    <span className="rounded-xl bg-pam-basil px-3 py-2 text-xs font-bold text-white">
                      Google Maps →
                    </span>
                  </a>
                );
              })()}

              <section className="rounded-2xl border border-pam-border/70 bg-pam-sand/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-pam-ink">
                    Who ordered
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(order.status)}`}
                  >
                    {order.kitchenLabel || order.status}
                  </span>
                </div>

                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                      Name on order
                    </dt>
                    <dd className="mt-0.5 text-sm font-bold text-pam-ink">
                      {order.customer}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                      Phone
                    </dt>
                    <dd className="mt-0.5 text-sm font-bold text-pam-ink">
                      <a href={`tel:${order.phone}`} className="text-pam-red">
                        {order.phone}
                      </a>
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                      {order.fulfillment === "pickup"
                        ? "Pickup"
                        : "Delivery address"}
                    </dt>
                    <dd className="mt-0.5 text-sm leading-relaxed text-pam-ink">
                      {order.address}
                    </dd>
                  </div>
                  {order.notesMeta.area && (
                    <div>
                      <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                        Area
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold text-pam-ink">
                        {order.notesMeta.area}
                      </dd>
                    </div>
                  )}
                  {order.notesMeta.landmark && (
                    <div>
                      <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                        Landmark
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold text-pam-ink">
                        {order.notesMeta.landmark}
                      </dd>
                    </div>
                  )}
                  {order.notesMeta.place && (
                    <div>
                      <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                        Near
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold text-pam-ink">
                        {order.notesMeta.place}
                      </dd>
                    </div>
                  )}
                  {order.notesMeta.gps && order.fulfillment !== "pickup" && (
                    <div className="sm:col-span-2">
                      <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                        GPS coordinates
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold text-pam-ink">
                        {order.notesMeta.gps}
                        {order.notesMeta.accuracyMeters
                          ? ` (±${order.notesMeta.accuracyMeters} m)`
                          : ""}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="mt-4 rounded-2xl border border-dashed border-pam-border bg-white/80 p-3.5">
                  <p className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                    Account
                  </p>
                  {order.account ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <p className="text-sm text-pam-ink">
                        <span className="font-bold">{order.account.name}</span>
                        <span className="mt-0.5 block text-xs text-pam-muted">
                          {order.account.email}
                        </span>
                      </p>
                      <p className="text-sm text-pam-ink">
                        <span className="font-semibold capitalize">
                          {order.account.role}
                        </span>
                        {order.account.phone && (
                          <span className="mt-0.5 block text-xs text-pam-muted">
                            Account phone: {order.account.phone}
                          </span>
                        )}
                        {order.account.memberSince && (
                          <span className="mt-0.5 block text-xs text-pam-muted">
                            Member since {formatWhen(order.account.memberSince)}
                          </span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-pam-muted">
                      Guest checkout - no signed-in account was linked to this
                      order.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-pam-border/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-pam-ink">
                    Food ordered
                  </h3>
                  {promoCodesFromNotes(order.notes).length ? (
                    <span className="rounded-full bg-pam-gold/30 px-2.5 py-1 text-[10px] font-bold text-pam-ink uppercase">
                      Promo · {promoCodesFromNotes(order.notes).join(", ")}
                    </span>
                  ) : null}
                </div>
                <ul className="mt-3 divide-y divide-pam-border/70">
                  {order.lineItems.map((line, i) => {
                    const promoBadge = isPromoOrderLineName(line.name)
                      ? promoLineBadge(line.name)
                      : "";
                    return (
                    <li
                      key={`${line.name}-${i}`}
                      className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-pam-ink">
                          {line.name}
                        </p>
                        <p className="text-xs text-pam-muted">
                          {formatPrice(line.unitPrice)} × {line.quantity}
                          {promoBadge ? (
                            <span className="ml-2 rounded-md bg-pam-red/10 px-1.5 py-0.5 font-bold text-pam-red">
                              {promoBadge}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-pam-ink">
                        {formatPrice(line.lineTotal)}
                      </p>
                    </li>
                    );
                  })}
                </ul>

                <div className="mt-3 space-y-1.5 border-t border-pam-border/70 pt-3 text-sm">
                  <div className="flex justify-between text-pam-muted">
                    <span>Food subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-pam-muted">
                    <span>Delivery fee</span>
                    <span>{formatPrice(order.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between font-[family-name:var(--font-oswald)] text-lg text-pam-ink">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-pam-border/70 p-4">
                <h3 className="text-sm font-extrabold text-pam-ink">
                  Payment & notes
                </h3>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                      Payment method
                    </dt>
                    <dd className="mt-0.5 text-sm font-bold text-pam-ink">
                      {order.paymentLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                      Payment status
                    </dt>
                    <dd
                      className={`mt-0.5 text-sm font-bold ${
                        order.paymentStatus === "paid"
                          ? "text-pam-basil"
                          : order.paymentStatus === "failed"
                            ? "text-pam-red"
                            : "text-[#c45a12]"
                      }`}
                    >
                      {order.paymentStatus === "paid"
                        ? "Paid"
                        : order.paymentStatus === "failed"
                          ? "Failed"
                          : "Awaiting payment"}
                    </dd>
                  </div>
                  {order.email ? (
                    <div>
                      <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                        Customer email
                      </dt>
                      <dd className="mt-0.5 text-sm font-semibold text-pam-ink">
                        {order.email}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                      Last updated
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold text-pam-ink">
                      {formatWhen(order.updatedAt)}
                    </dd>
                  </div>
                </dl>
                {order.notesMeta.extra.length > 0 && (
                  <p className="mt-3 text-sm text-pam-muted">
                    Extra notes: {order.notesMeta.extra.join(" · ")}
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-pam-border/70 bg-pam-sand/20 p-4">
                <h3 className="text-sm font-extrabold text-pam-ink">
                  Update status
                </h3>
                <p className="mt-1 text-xs text-pam-muted">
                  Change this so the customer can see progress on their phone.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="input-field flex-1 rounded-2xl"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={saving || status === order.status}
                    onClick={() => void saveStatus()}
                    className="rounded-2xl bg-pam-red px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save status"}
                  </button>
                </div>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void deleteOrder()}
                  className="mt-3 w-full rounded-2xl bg-pam-red/10 px-4 py-3 text-sm font-bold text-pam-red disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete this order"}
                </button>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
