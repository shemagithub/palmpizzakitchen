"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PageHero from "@/components/PageHero";
import { api, getToken } from "@/lib/api";
import { formatPrice } from "@/data/menu";
import { rememberOrder, rememberedOrderIds } from "@/lib/myOrders";
import { useAuthUser } from "@/hooks/useAuthUser";

type Order = {
  id: string;
  items: string;
  total: number;
  status: string;
  kitchenLabel?: string;
  paymentStatus?: string;
  paymentLabel?: string;
  paidAt?: string | null;
  fulfillment?: string;
  address?: string;
  createdAt?: string;
  created_at?: string;
};

type Filter = "all" | "awaiting" | "paid";

function isPaid(order: Order) {
  return order.paymentStatus === "paid";
}

function isFailed(order: Order) {
  return order.paymentStatus === "failed";
}

function isAwaiting(order: Order) {
  return !isPaid(order) && !isFailed(order);
}

function formatWhen(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function paymentBadge(order: Order) {
  if (isPaid(order)) {
    return {
      label: "Paid",
      className: "bg-pam-basil text-white",
    };
  }
  if (isFailed(order)) {
    return {
      label: "Payment failed",
      className: "bg-pam-red text-white",
    };
  }
  return {
    label: "Awaiting payment",
    className: "bg-[#c45a12] text-white",
  };
}

export default function OrdersClient() {
  const { user } = useAuthUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [lookupId, setLookupId] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const ids = rememberedOrderIds();
    const qs = ids.length ? `?ids=${encodeURIComponent(ids.join(","))}` : "";
    if (!getToken() && !ids.length) {
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      const data = await api<{ orders: Order[] }>(`/orders/mine${qs}`);
      setOrders(data.orders || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const awaiting = orders.some(isAwaiting);
    if (!awaiting) return;
    const timer = window.setInterval(() => {
      void load();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [orders, load]);

  const counts = useMemo(
    () => ({
      all: orders.length,
      awaiting: orders.filter(isAwaiting).length,
      paid: orders.filter(isPaid).length,
    }),
    [orders],
  );

  const visible = useMemo(() => {
    const list =
      filter === "awaiting"
        ? orders.filter(isAwaiting)
        : filter === "paid"
          ? orders.filter(isPaid)
          : orders;
    return [...list].sort((a, b) => {
      const rank = (order: Order) =>
        isAwaiting(order) ? 0 : isFailed(order) ? 1 : 2;
      return rank(a) - rank(b);
    });
  }, [orders, filter]);

  const findOrder = async () => {
    setLookupBusy(true);
    setError("");
    try {
      const data = await api<{ order: Order }>("/orders/lookup", {
        method: "POST",
        body: JSON.stringify({
          orderId: lookupId.trim(),
          email: lookupEmail.trim(),
        }),
      });
      rememberOrder(data.order.id, lookupEmail.trim());
      setOrders((prev) => {
        const rest = prev.filter((row) => row.id !== data.order.id);
        return [data.order, ...rest];
      });
      setFilter("all");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find that order.");
    } finally {
      setLookupBusy(false);
    }
  };

  const retryPayment = async (order: Order) => {
    setError("");
    setNotice("");
    const email = (
      lookupEmail.trim() ||
      user?.email ||
      ""
    ).trim();
    if (!email) {
      setError("Enter your email in Find a guest order, or sign in to pay.");
      return;
    }
    setPayingId(order.id);
    try {
      const started = await api<{
        payment?: {
          reference?: string;
          status?: string;
          message?: string;
        };
      }>(`/orders/${encodeURIComponent(order.id)}/retry-payment`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const reference = started.payment?.reference || "";
      setNotice(
        started.payment?.message ||
          "Approve the Mobile Money prompt on your phone…",
      );
      const deadline = Date.now() + 180000;
      while (Date.now() < deadline) {
        const status = await api<{ payment?: { status?: string } }>(
          `/payments/${encodeURIComponent(order.id)}?reference=${encodeURIComponent(reference)}`,
        );
        if (status.payment?.status === "paid") {
          setNotice("Payment confirmed. Thank you!");
          await load();
          return;
        }
        if (status.payment?.status === "failed") {
          throw new Error("Payment was declined or timed out.");
        }
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
      }
      throw new Error(
        "Still waiting for payment. Check your phone and refresh this page.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment could not start.");
    } finally {
      setPayingId(null);
    }
  };

  return (
    <>
      <PageHero
        title="My Orders"
        subtitle="See what is paid, what is waiting for payment, and how the kitchen is progressing."
      />
      <section className="bg-pam-warm py-8 md:py-12">
        <div className="mx-auto max-w-4xl space-y-4 px-4 md:px-8">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", `All (${counts.all})`],
                ["awaiting", `Awaiting payment (${counts.awaiting})`],
                ["paid", `Paid (${counts.paid})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full px-3.5 py-2 text-xs font-bold ${
                  filter === key
                    ? "bg-pam-red text-white"
                    : "bg-white text-pam-ink ring-1 ring-pam-border"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-2xl bg-pam-red/10 px-4 py-3 text-sm text-pam-red">
              {error}{" "}
              {!getToken() && (
                <Link href="/account" className="font-bold underline">
                  Sign in
                </Link>
              )}
            </div>
          )}
          {notice && (
            <div className="rounded-2xl bg-pam-basil/10 px-4 py-3 text-sm text-pam-basil">
              {notice}
            </div>
          )}

          <div className="soft-card rounded-3xl border border-pam-border/70 bg-white p-4">
            <p className="text-sm font-bold text-pam-ink">Find a guest order</p>
            <p className="mt-1 text-xs text-pam-muted">
              Paid without an account? Enter the order number from your receipt
              and the same email.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.2fr_auto]">
              <input
                className="input-field rounded-2xl"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder="ORD-1234"
              />
              <input
                className="input-field rounded-2xl"
                type="email"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                placeholder="you@email.com"
              />
              <button
                type="button"
                disabled={lookupBusy}
                onClick={() => void findOrder()}
                className="rounded-2xl bg-pam-ink px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
              >
                {lookupBusy ? "Finding…" : "Find"}
              </button>
            </div>
          </div>

          {loading && (
            <p className="text-center text-sm text-pam-muted">Loading orders…</p>
          )}

          {visible.map((order) => {
            const pay = paymentBadge(order);
            const when = formatWhen(order.paidAt || order.createdAt || order.created_at);
            return (
              <article
                key={order.id}
                className="soft-card rounded-3xl border border-pam-border/70 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{order.id}</p>
                    <p className="mt-1 text-sm text-pam-muted">{order.items}</p>
                    {when && (
                      <p className="mt-1 text-[11px] text-pam-muted">{when}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${pay.className}`}
                    >
                      {pay.label}
                    </span>
                    <p className="mt-2 font-[family-name:var(--font-oswald)] text-xl">
                      {formatPrice(order.total)}
                    </p>
                    {order.paymentLabel && (
                      <p className="text-[11px] font-semibold text-pam-muted">
                        {order.paymentLabel}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className={`mt-4 rounded-2xl px-3.5 py-3 text-sm ${
                    isPaid(order)
                      ? "bg-pam-basil/10 text-pam-ink"
                      : isFailed(order)
                        ? "bg-pam-red/10 text-pam-red"
                        : "bg-pam-gold-soft text-pam-ink"
                  }`}
                >
                  <p className="text-[10px] font-bold tracking-wide uppercase text-pam-muted">
                    {isPaid(order) ? "Kitchen / delivery" : "Payment status"}
                  </p>
                  <p className="mt-0.5 font-bold">
                    {order.kitchenLabel ||
                      (isPaid(order) ? order.status : "Waiting for payment")}
                  </p>
                  {order.address && (
                    <p className="mt-1 text-xs text-pam-muted">{order.address}</p>
                  )}
                  {isAwaiting(order) && (
                    <button
                      type="button"
                      disabled={payingId === order.id}
                      onClick={() => void retryPayment(order)}
                      className="mt-3 rounded-xl bg-pam-red px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {payingId === order.id ? "Waiting for MoMo…" : "Pay now"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}

          {!loading && !visible.length && (
            <p className="text-center text-sm text-pam-muted">
              {filter === "awaiting"
                ? "No orders waiting for payment."
                : filter === "paid"
                  ? "No paid orders yet."
                  : "No orders yet. Place an order, or find a guest order above."}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
