"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

export function AdminPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-bold tracking-[0.18em] text-pam-red uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-oswald)] text-[1.75rem] leading-tight tracking-wide text-pam-ink sm:text-3xl md:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-pam-muted sm:text-[0.95rem]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 [&_a]:min-h-11 [&_button]:min-h-11">
          {actions}
        </div>
      )}
    </div>
  );
}

/** Soft tip box for non-technical guidance. Optional dismiss key remembers “Got it”. */
export function AdminHelpTip({
  title = "Quick tip",
  children,
  dismissKey,
}: {
  title?: string;
  children: ReactNode;
  dismissKey?: string;
}) {
  const storageKey = dismissKey
    ? `palm-admin-tip-dismissed:${dismissKey}`
    : null;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(storageKey) === "1") setHidden(true);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-pam-gold/40 bg-pam-gold-soft/70 px-4 py-3.5 text-sm leading-relaxed text-pam-ink">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-extrabold tracking-wide text-pam-ink/80 uppercase">
          {title}
        </p>
        {storageKey && (
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-pam-ink/55 hover:bg-white/50 hover:text-pam-ink"
          >
            Got it
          </button>
        )}
      </div>
      <div className="mt-1 text-pam-ink/85">{children}</div>
    </div>
  );
}

export function AdminAlert({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "ok" | "info";
}) {
  const styles =
    tone === "ok"
      ? "bg-pam-basil/10 text-pam-basil"
      : tone === "info"
        ? "bg-pam-gold-soft text-pam-ink"
        : "bg-pam-red/10 text-pam-red";
  const prefix =
    tone === "ok" ? "Done: " : tone === "info" ? "Note: " : "Problem: ";
  return (
    <div className={`mb-4 rounded-2xl px-4 py-3.5 text-sm font-medium leading-relaxed ${styles}`}>
      <span className="font-extrabold">{prefix}</span>
      {children}
    </div>
  );
}

export function AdminCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-pam-border/70 bg-white shadow-[0_8px_24px_rgba(28,25,23,0.05)] sm:rounded-3xl ${className}`}
    >
      {children}
    </div>
  );
}

export function AdminSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading">
      <p className="text-sm font-semibold text-pam-muted">Loading… please wait</p>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-2xl bg-pam-sand/80"
        />
      ))}
    </div>
  );
}

/** Big friendly shortcut buttons for the dashboard */
export function AdminSimpleActions({
  items,
}: {
  items: {
    href: string;
    title: string;
    desc: string;
    tone?: "red" | "ink" | "sand";
  }[];
}) {
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-2xl p-4 transition hover:-translate-y-0.5 active:scale-[0.99] sm:p-5 ${
            item.tone === "red"
              ? "bg-pam-red text-white shadow-[0_12px_28px_rgba(227,24,55,0.25)]"
              : item.tone === "ink"
                ? "bg-pam-ink text-white"
                : "border border-pam-border bg-white text-pam-ink"
          }`}
        >
          <p className="font-[family-name:var(--font-oswald)] text-xl tracking-wide">
            {item.title}
          </p>
          <p
            className={`mt-1 text-sm leading-snug ${
              item.tone === "sand" || !item.tone
                ? "text-pam-muted"
                : "text-white/80"
            }`}
          >
            {item.desc}
          </p>
          <p
            className={`mt-3 text-sm font-bold ${
              item.tone === "sand" || !item.tone ? "text-pam-red" : "text-white"
            }`}
          >
            Open →
          </p>
        </Link>
      ))}
    </div>
  );
}

export const STOREFRONT_LINKS = [
  { href: "/", label: "Home page", desc: "Customer landing page" },
  { href: "/pizzas", label: "Pizzas", desc: "Pizza menu" },
  { href: "/burgers", label: "Burgers", desc: "Beef, chicken & veggie" },
  { href: "/sides", label: "Sides", desc: "Sides & extras" },
  { href: "/drinks", label: "Drinks", desc: "Soft drinks & juice" },
  { href: "/combos", label: "Combos", desc: "Meal deals" },
  { href: "/offers", label: "Offers", desc: "Promo codes" },
  { href: "/admin/about", label: "About page", desc: "Edit About content" },
  { href: "/about", label: "About", desc: "Your story" },
  { href: "/admin/contact", label: "Contact inbox", desc: "Messages sent from the contact form" },
  { href: "/contact", label: "Contact page", desc: "Customer contact form" },
  { href: "/cart", label: "Cart", desc: "Shopping bag" },
  { href: "/checkout", label: "Checkout", desc: "Place an order" },
  { href: "/account", label: "Account", desc: "Login / signup" },
  { href: "/orders", label: "My Orders", desc: "Customer order list" },
  { href: "/privacy", label: "Privacy", desc: "Legal page" },
  { href: "/terms", label: "Terms", desc: "Legal page" },
  { href: "/refund", label: "Refunds", desc: "Legal page" },
] as const;

export function StorefrontGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`grid gap-2 ${
        compact
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
      }`}
    >
      {STOREFRONT_LINKS.map((page) => (
        <Link
          key={page.href}
          href={page.href}
          target="_blank"
          rel="noreferrer"
          className="group rounded-2xl border border-pam-border/70 bg-pam-sand/40 px-3 py-3 transition hover:-translate-y-0.5 hover:border-pam-red/30 hover:bg-white hover:shadow-sm"
        >
          <p className="text-sm font-bold text-pam-ink group-hover:text-pam-red">
            {page.label}
          </p>
          {!compact && (
            <p className="mt-0.5 text-xs text-pam-muted">{page.desc}</p>
          )}
          <p className="mt-2 text-[11px] font-bold text-pam-red opacity-0 transition group-hover:opacity-100">
            Open page →
          </p>
        </Link>
      ))}
    </div>
  );
}
