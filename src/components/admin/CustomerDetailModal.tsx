"use client";

import { useEffect, useState } from "react";
import { statusTone } from "@/data/admin";
import { formatPrice } from "@/data/menu";
import { api } from "@/lib/api";

export type CustomerDetail = {
  id: string;
  userId?: number;
  source?: string;
  hasAccount?: boolean;
  name: string;
  email: string;
  phone: string;
  role: string;
  emailVerified: boolean;
  joinedAt: string;
  joined: string;
  orders: number;
  spent: number;
  delivered: number;
  cancelled: number;
  lastOrderAt: string | null;
  orderHistory: {
    id: string;
    customer: string;
    phone: string;
    address: string;
    paymentMethod: string;
    status: string;
    subtotal: number;
    deliveryFee: number;
    total: number;
    notes: string;
    time: string;
    updatedAt?: string;
    items: string;
    lineItems: {
      name: string;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }[];
  }[];
  possibleGuestOrders: {
    id: string;
    customer: string;
    phone: string;
    address: string;
    paymentMethod: string;
    status: string;
    total: number;
    time: string;
    items: string;
    guestCheckout?: boolean;
  }[];
};

function formatWhen(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

type Props = {
  customerId: string | null;
  onClose: () => void;
  onOpenOrder?: (orderId: string) => void;
  onUpdated?: () => void;
  startInEdit?: boolean;
};

export default function CustomerDetailModal({
  customerId,
  onClose,
  onOpenOrder,
  onUpdated,
  startInEdit = false,
}: Props) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");

  useEffect(() => {
    if (!customerId) {
      setCustomer(null);
      setError("");
      setExpandedOrder(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    api<{ customer: CustomerDetail }>(
      `/customers/${encodeURIComponent(customerId)}`,
    )
      .then((data) => {
        if (cancelled) return;
        setCustomer(data.customer);
        setFormName(data.customer.name || "");
        setFormEmail(data.customer.email || "");
        setFormPhone(data.customer.phone || "");
        setEditing(startInEdit);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not load customer.",
        );
        setCustomer(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customerId, startInEdit]);

  useEffect(() => {
    if (!customerId) return;
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
  }, [customerId, onClose]);

  const saveCustomer = async () => {
    if (!customerId || !formName.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api(`/customers/${encodeURIComponent(customerId)}`, {
        method: "PUT",
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
        }),
      });
      setCustomer((current) =>
        current
          ? {
              ...current,
              name: formName.trim(),
              email: formEmail.trim(),
              phone: formPhone.trim(),
            }
          : current,
      );
      setEditing(false);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async () => {
    if (!customerId || !customer) return;
    const isCheckout = customer.source === "checkout";
    const ok = window.confirm(
      isCheckout
        ? `Delete ${customer.name} from this list? This also removes their checkout orders from Orders.`
        : `Delete ${customer.name}'s shop account? Past orders stay in Orders, unlinked from this account.`,
    );
    if (!ok) return;
    setDeleting(true);
    setError("");
    try {
      await api(`/customers/${encodeURIComponent(customerId)}`, {
        method: "DELETE",
      });
      onUpdated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setDeleting(false);
    }
  };

  if (!customerId) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close customer details"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-detail-title"
        className="relative z-[91] flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-pam-border/80 bg-pam-sand/40 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pam-red font-[family-name:var(--font-oswald)] text-sm font-bold text-white">
              {customer ? initials(customer.name) : "…"}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.16em] text-pam-red uppercase">
                    Customer details
                    {customer?.source === "checkout" ? " · checkout" : ""}
              </p>
              <h2
                id="customer-detail-title"
                className="mt-0.5 truncate font-[family-name:var(--font-oswald)] text-2xl tracking-wide text-pam-ink"
              >
                {customer?.name || customerId}
              </h2>
              {customer && (
                <p className="truncate text-xs text-pam-muted">
                  {customer.id} · Member since {formatWhen(customer.joinedAt)}
                </p>
              )}
            </div>
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
              Loading customer… please wait
            </p>
          )}

          {error && (
            <div className="mb-4 rounded-2xl bg-pam-red/10 px-4 py-3 text-sm font-medium text-pam-red">
              Problem: {error}
            </div>
          )}

          {customer && !loading && (
            <div className="space-y-4">
              <section className="flex flex-wrap gap-2">
                {!editing ? (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
                  >
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveCustomer()}
                      className="rounded-xl bg-pam-red px-3.5 py-2 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setFormName(customer.name);
                        setFormEmail(customer.email);
                        setFormPhone(customer.phone);
                      }}
                      className="rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
                    >
                      Cancel
                    </button>
                  </>
                )}
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void deleteCustomer()}
                  className="rounded-xl bg-pam-red px-3.5 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </section>

              {editing && (
                <section className="space-y-3 rounded-2xl border border-pam-border/70 bg-white p-4">
                  <label className="block text-sm font-semibold">
                    Full name
                    <input
                      className="input-field mt-1.5 rounded-2xl"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-semibold">
                    Email
                    <input
                      className="input-field mt-1.5 rounded-2xl"
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-semibold">
                    Phone
                    <input
                      className="input-field mt-1.5 rounded-2xl"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </label>
                </section>
              )}

              <section className="rounded-2xl border border-pam-border/70 bg-pam-sand/30 p-4">
                <h3 className="text-sm font-extrabold text-pam-ink">
                  Contact & account
                </h3>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                      Full name
                    </dt>
                    <dd className="mt-0.5 text-sm font-bold text-pam-ink">
                      {customer.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                      Email
                    </dt>
                    <dd className="mt-0.5 text-sm font-bold text-pam-ink">
                      <a
                        href={`mailto:${customer.email}`}
                        className="break-all text-pam-red"
                      >
                        {customer.email}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                      Phone
                    </dt>
                    <dd className="mt-0.5 text-sm font-bold text-pam-ink">
                      {customer.phone ? (
                        <a href={`tel:${customer.phone}`} className="text-pam-red">
                          {customer.phone}
                        </a>
                      ) : (
                        <span className="font-semibold text-pam-muted">
                          Not saved on account
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                      Email verified
                    </dt>
                    <dd className="mt-0.5 text-sm font-bold text-pam-ink">
                      {customer.emailVerified ? "Yes" : "Not yet"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                      Last order
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold text-pam-ink">
                      {formatWhen(customer.lastOrderAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                      Account type
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold capitalize text-pam-ink">
                      {customer.role}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Orders", value: String(customer.orders) },
                  { label: "Spent", value: formatPrice(customer.spent) },
                  { label: "Delivered", value: String(customer.delivered) },
                  { label: "Cancelled", value: String(customer.cancelled) },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-pam-border/70 bg-white p-3 text-center"
                  >
                    <p className="text-[10px] font-bold tracking-wide text-pam-muted uppercase">
                      {stat.label}
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-oswald)] text-lg text-pam-ink">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </section>

              <section className="rounded-2xl border border-pam-border/70 p-4">
                <h3 className="text-sm font-extrabold text-pam-ink">
                  Order history
                </h3>
                <p className="mt-1 text-xs text-pam-muted">
                  Tap an order to see the food list and delivery address.
                </p>

                {!customer.orderHistory.length ? (
                  <p className="mt-4 text-sm text-pam-muted">
                    This customer has not placed a linked order yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {customer.orderHistory.map((order) => {
                      const open = expandedOrder === order.id;
                      return (
                        <li
                          key={order.id}
                          className="overflow-hidden rounded-2xl border border-pam-border/70 bg-pam-sand/20"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOrder(open ? null : order.id)
                            }
                            className="flex w-full items-start justify-between gap-3 px-3.5 py-3 text-left"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-pam-ink">
                                {order.id}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-pam-muted">
                                {formatWhen(order.time)} · {order.items}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone(order.status)}`}
                              >
                                {order.status}
                              </span>
                              <p className="mt-1 text-sm font-bold text-pam-ink">
                                {formatPrice(order.total)}
                              </p>
                            </div>
                          </button>

                          {open && (
                            <div className="border-t border-pam-border/70 bg-white px-3.5 py-3">
                              <p className="text-xs font-bold text-pam-muted uppercase">
                                Delivery
                              </p>
                              <p className="mt-1 text-sm text-pam-ink">
                                {order.address}
                              </p>
                              <p className="mt-1 text-xs text-pam-muted">
                                Phone on order:{" "}
                                <a
                                  href={`tel:${order.phone}`}
                                  className="font-bold text-pam-red"
                                >
                                  {order.phone}
                                </a>
                              </p>

                              <ul className="mt-3 divide-y divide-pam-border/60">
                                {order.lineItems.map((line, i) => (
                                  <li
                                    key={`${line.name}-${i}`}
                                    className="flex justify-between gap-3 py-2 text-sm"
                                  >
                                    <span>
                                      {line.name}{" "}
                                      <span className="text-pam-muted">
                                        ×{line.quantity}
                                      </span>
                                    </span>
                                    <span className="font-bold">
                                      {formatPrice(line.lineTotal)}
                                    </span>
                                  </li>
                                ))}
                              </ul>

                              <div className="mt-2 space-y-1 border-t border-pam-border/60 pt-2 text-xs text-pam-muted">
                                <div className="flex justify-between">
                                  <span>Subtotal</span>
                                  <span>{formatPrice(order.subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Delivery</span>
                                  <span>{formatPrice(order.deliveryFee)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-pam-ink">
                                  <span>Total</span>
                                  <span>{formatPrice(order.total)}</span>
                                </div>
                              </div>

                              {onOpenOrder && (
                                <button
                                  type="button"
                                  onClick={() => onOpenOrder(order.id)}
                                  className="mt-3 w-full rounded-xl bg-pam-ink px-3 py-2.5 text-xs font-bold text-white"
                                >
                                  Open full order card
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {customer.possibleGuestOrders.length > 0 && (
                <section className="rounded-2xl border border-dashed border-pam-border p-4">
                  <h3 className="text-sm font-extrabold text-pam-ink">
                    Possible guest orders
                  </h3>
                  <p className="mt-1 text-xs text-pam-muted">
                    Same name or phone, but not linked to this account (guest
                    checkout).
                  </p>
                  <ul className="mt-3 space-y-2">
                    {customer.possibleGuestOrders.map((order) => (
                      <li
                        key={order.id}
                        className="flex items-start justify-between gap-3 rounded-xl bg-pam-sand/40 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-pam-ink">
                            {order.id}
                          </p>
                          <p className="truncate text-xs text-pam-muted">
                            {formatWhen(order.time)} · {order.items}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone(order.status)}`}
                          >
                            {order.status}
                          </span>
                          <p className="mt-1 text-sm font-bold">
                            {formatPrice(order.total)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
