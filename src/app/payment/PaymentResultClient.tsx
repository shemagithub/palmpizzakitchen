"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { clearGuestCart } from "@/lib/cart";
import { rememberOrder } from "@/lib/myOrders";
import { formatPrice } from "@/data/menu";

type PayState = "checking" | "paid" | "pending" | "failed";

function PaymentResultInner() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<PayState>("checking");
  const [message, setMessage] = useState("Verifying your payment…");
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    let stored: { orderId?: string; reference?: string } = {};
    try {
      stored = JSON.parse(sessionStorage.getItem("palm_pay") || "{}") as {
        orderId?: string;
        reference?: string;
      };
    } catch {
      stored = {};
    }

    const id = searchParams.get("orderId") || stored.orderId || "";
    const reference =
      searchParams.get("reference") ||
      searchParams.get("refid") ||
      stored.reference ||
      "";
    setOrderId(id);

    if (!id) {
      setState("failed");
      setMessage("Missing order reference. If you paid, check My Orders.");
      return;
    }

    let cancelled = false;
    const started = Date.now();

    async function poll() {
      while (!cancelled && Date.now() - started < 180000) {
        try {
          const data = await api<{
            payment?: { status?: string; amount?: number };
          }>(
            `/payments/${id}?reference=${encodeURIComponent(reference)}`,
          );
          if (cancelled) return;
          if (data.payment?.amount) setAmount(Number(data.payment.amount));
          if (data.payment?.status === "paid") {
            clearGuestCart();
            sessionStorage.removeItem("palm_pay");
            if (id) rememberOrder(id);
            setState("paid");
            setMessage(
              "Payment confirmed. A PDF receipt has been emailed to you, and the kitchen has been notified.",
            );
            return;
          }
          if (data.payment?.status === "failed") {
            setState("failed");
            setMessage("Payment was declined, cancelled, or timed out.");
            return;
          }
          setState("pending");
          setMessage("Payment is still pending. Approve it on your phone or card page.");
        } catch (err) {
          if (cancelled) return;
          setMessage(
            err instanceof Error ? err.message : "Could not verify payment yet.",
          );
        }
        await new Promise((r) => window.setTimeout(r, 3000));
      }
      if (!cancelled) {
        setState("pending");
        setMessage(
          "We have not received confirmation yet. Check My Orders in a moment.",
        );
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <section className="flex min-h-[70vh] items-center justify-center bg-pam-warm px-4 py-16">
      <div className="soft-card w-full max-w-md rounded-[1.75rem] border border-pam-border/70 bg-white p-8 text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white ${
            state === "paid"
              ? "bg-pam-basil"
              : state === "failed"
                ? "bg-pam-red"
                : "bg-pam-ink"
          }`}
        >
          {state === "paid" ? "✓" : state === "failed" ? "!" : "…"}
        </div>
        <h1 className="mt-4 font-[family-name:var(--font-oswald)] text-3xl text-pam-ink">
          {state === "paid"
            ? "Payment successful"
            : state === "failed"
              ? "Payment not completed"
              : "Checking payment"}
        </h1>
        <p className="mt-3 text-sm text-pam-muted">{message}</p>
        {orderId && (
          <p className="mt-4 text-sm font-bold text-pam-ink">Order {orderId}</p>
        )}
        {amount != null && (
          <p className="mt-1 font-[family-name:var(--font-oswald)] text-2xl">
            {formatPrice(amount)}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/orders"
            className="rounded-full bg-pam-red px-5 py-3 text-sm font-bold text-white"
          >
            My orders
          </Link>
          <Link
            href="/"
            className="rounded-full bg-pam-sand px-5 py-3 text-sm font-bold text-pam-ink"
          >
            Back home
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function PaymentResultClient() {
  return (
    <Suspense
      fallback={
        <section className="flex min-h-[70vh] items-center justify-center bg-pam-warm">
          <p className="text-sm text-pam-muted">Loading payment status…</p>
        </section>
      }
    >
      <PaymentResultInner />
    </Suspense>
  );
}
