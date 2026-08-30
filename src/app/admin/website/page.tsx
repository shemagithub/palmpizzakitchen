"use client";

import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import {
  AdminCard,
  AdminHelpTip,
  AdminPageHeader,
  STOREFRONT_LINKS,
  StorefrontGrid,
} from "@/components/admin/AdminUI";

const FLOW = [
  {
    title: "Customer picks food",
    pages: "Pizzas · Sides · Combos",
    tip: "They browse the menu and add items to the cart.",
  },
  {
    title: "They pay or place the order",
    pages: "Cart · Checkout",
    tip: "New orders show up under Orders in this shop manager.",
  },
  {
    title: "They track their order",
    pages: "Account · My Orders",
    tip: "When you update status, they can see it on their phone.",
  },
  {
    title: "Offers & messages",
    pages: "Offers · Contact",
    tip: "Promo codes and contact messages land here for your team.",
  },
] as const;

export default function AdminWebsitePage() {
  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Website look"
        title="Customer website pages"
        subtitle="Open any shop page in a new tab to see what customers see."
        actions={
          <Link
            href="/"
            target="_blank"
            className="rounded-xl bg-pam-red px-3.5 py-2.5 text-sm font-bold text-white"
          >
            Open home page
          </Link>
        }
      />

      <AdminHelpTip title="Tip">
        Use these links to double-check after you change the menu, banner, or
        settings. Tap a page name - it opens in a new tab.
      </AdminHelpTip>

      <AdminCard className="mb-5 p-4 sm:p-5">
        <h2 className="font-[family-name:var(--font-oswald)] text-xl">
          How a customer order works
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {FLOW.map((step, i) => (
            <div
              key={step.title}
              className="rounded-2xl border border-pam-border/70 bg-pam-sand/40 p-4"
            >
              <p className="text-[11px] font-bold tracking-wide text-pam-red uppercase">
                Step {i + 1}
              </p>
              <p className="mt-1 text-sm font-bold text-pam-ink">{step.title}</p>
              <p className="mt-1 text-xs font-semibold text-pam-muted">
                {step.pages}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-pam-ink/70">
                {step.tip}
              </p>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-[family-name:var(--font-oswald)] text-xl">
              All shop pages
            </h2>
            <p className="text-sm text-pam-muted">
              {STOREFRONT_LINKS.length} pages - each opens in a new tab
            </p>
          </div>
        </div>
        <StorefrontGrid />
      </AdminCard>
    </AdminShell>
  );
}
