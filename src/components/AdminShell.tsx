"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import AdminNotifications from "@/components/admin/AdminNotifications";
import BrandLogo from "@/components/BrandLogo";
import {
  BagIcon,
  CloseIcon,
  GridIcon,
  HeartIcon,
  HomeIcon,
  LeafIcon,
  MailIcon,
  MenuIcon,
  PizzaIcon,
  ScooterIcon,
  ShieldIcon,
  SlidersIcon,
  SparkIcon,
  TagIcon,
  UserIcon,
  ReceiptIcon,
} from "@/components/icons";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { useAuthUser } from "@/hooks/useAuthUser";
import { api, clearSession } from "@/lib/api";

type NavItem = {
  label: string;
  hint: string;
  href: string;
  Icon: (props: { className?: string }) => ReactNode;
  short: string;
};

const DAILY: NavItem[] = [
  {
    label: "Home",
    hint: "See today’s numbers",
    href: "/admin",
    Icon: HomeIcon,
    short: "Home",
  },
  {
    label: "Orders",
    hint: "New customer orders",
    href: "/admin/orders",
    Icon: BagIcon,
    short: "Orders",
  },
  {
    label: "Transactions",
    hint: "Money in and out",
    href: "/admin/transactions",
    Icon: ReceiptIcon,
    short: "Money",
  },
  {
    label: "Payouts",
    hint: "Send money out",
    href: "/admin/payouts",
    Icon: TagIcon,
    short: "Pay",
  },
  {
    label: "Customers",
    hint: "People who ordered",
    href: "/admin/customers",
    Icon: UserIcon,
    short: "People",
  },
  {
    label: "Mailbox",
    hint: "info@ shop email",
    href: "/admin/mail",
    Icon: MailIcon,
    short: "Mail",
  },
];

const FOOD: NavItem[] = [
  {
    label: "Food menu",
    hint: "Pizzas & sides",
    href: "/admin/menu",
    Icon: GridIcon,
    short: "Menu",
  },
  {
    label: "Combos",
    hint: "Meal deals",
    href: "/admin/combos",
    Icon: PizzaIcon,
    short: "Combos",
  },
  {
    label: "Offers",
    hint: "Discount codes",
    href: "/admin/offers",
    Icon: TagIcon,
    short: "Offers",
  },
];

const WEBSITE: NavItem[] = [
  {
    label: "Top banner",
    hint: "Big photos on home",
    href: "/admin/hero",
    Icon: SparkIcon,
    short: "Banner",
  },
  {
    label: "Home categories",
    hint: "Round shortcuts + photos",
    href: "/admin/categories",
    Icon: GridIcon,
    short: "Cats",
  },
  {
    label: "Reviews",
    hint: "Home page quotes",
    href: "/admin/reviews",
    Icon: HeartIcon,
    short: "Reviews",
  },
  {
    label: "Home content",
    hint: "Promos & banners",
    href: "/admin/home",
    Icon: LeafIcon,
    short: "Home",
  },
  {
    label: "About page",
    hint: "Story, features, photo",
    href: "/admin/about",
    Icon: ShieldIcon,
    short: "About",
  },
  {
    label: "Website pages",
    hint: "Open customer pages",
    href: "/admin/website",
    Icon: ScooterIcon,
    short: "Pages",
  },
  {
    label: "Contact form",
    hint: "Website message inbox",
    href: "/admin/contact",
    Icon: MailIcon,
    short: "Inbox",
  },
  {
    label: "Shop settings",
    hint: "Name, phone, fees",
    href: "/admin/settings",
    Icon: SlidersIcon,
    short: "Settings",
  },
];

const ALL_NAV = [...DAILY, ...FOOD, ...WEBSITE];

const MOBILE_NAV = [
  DAILY[0],
  DAILY[1],
  DAILY[5],
  DAILY[4],
  WEBSITE[WEBSITE.length - 1],
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSiteSettings();
  const { user, ready, isLoggedIn } = useAuthUser();
  const [open, setOpen] = useState(false);
  const [guard, setGuard] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    if (!ready) return;
    if (!isLoggedIn || user?.role !== "admin") {
      setGuard("denied");
      return;
    }
    void (async () => {
      try {
        const data = await api<{ user: { role?: string } }>("/auth/me");
        if (data.user?.role !== "admin") {
          setGuard("denied");
          return;
        }
        setGuard("ok");
      } catch {
        clearSession();
        setGuard("denied");
      }
    })();
  }, [ready, isLoggedIn, user?.role]);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const logout = () => {
    clearSession();
    router.push("/account");
  };

  if (!ready || guard === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3ebe3] px-4 text-sm font-semibold text-pam-muted">
        Checking shop manager access…
      </div>
    );
  }

  if (guard === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3ebe3] px-4">
        <div className="soft-card max-w-md rounded-3xl border border-pam-border bg-white p-6 text-center">
          <ShieldIcon className="mx-auto h-10 w-10 text-pam-red" />
          <h1 className="mt-3 font-[family-name:var(--font-oswald)] text-2xl text-pam-ink">
            Admin access only
          </h1>
          <p className="mt-2 text-sm text-pam-muted">
            Sign in with your shop manager account to open orders, menu, and
            settings.
          </p>
          <button
            type="button"
            onClick={() => router.push("/account")}
            className="mt-5 rounded-2xl bg-pam-red px-5 py-3 text-sm font-bold text-white"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  const renderGroup = (
    title: string,
    items: NavItem[],
    onNavigate?: () => void,
  ) => (
    <div className="mb-4">
      <p className="mb-1.5 px-3 text-[10px] font-bold tracking-[0.14em] text-white/35 uppercase">
        {title}
      </p>
      <div className="space-y-1">
        {items.map(({ label, hint, href, Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition active:scale-[0.98] ${
              isActive(href)
                ? "bg-pam-red text-white shadow-[0_10px_24px_rgba(227,24,55,0.28)]"
                : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight">
                {label}
              </span>
              <span
                className={`block text-[11px] leading-snug ${
                  isActive(href) ? "text-white/80" : "text-white/40"
                }`}
              >
                {hint}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3ebe3]">
      <header className="sticky top-0 z-40 border-b border-pam-border/80 bg-white/95 px-3 py-2.5 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <BrandLogo size="sm" href="/admin" />
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-pam-ink">
                Shop manager
              </p>
              <p className="truncate text-[10px] font-semibold text-pam-muted">
                Easy tools for {settings.company_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <AdminNotifications tone="light" />
            <Link
              href="/"
              className="rounded-xl bg-pam-sand px-2.5 py-2 text-[11px] font-bold text-pam-ink"
            >
              View shop
            </Link>
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-pam-ink text-white"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(90vw,340px)] flex-col overflow-y-auto bg-[#161210] p-4 text-white shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Menu</p>
                <p className="text-[11px] text-white/45">
                  Tap a section to continue
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-white/10 p-2.5"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            {renderGroup("Daily work", DAILY, () => setOpen(false))}
            {renderGroup("Food & deals", FOOD, () => setOpen(false))}
            {renderGroup("Website look", WEBSITE, () => setOpen(false))}
            <div className="mt-auto space-y-2 pt-2">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="block rounded-xl border border-white/15 px-4 py-3.5 text-center text-sm font-bold text-white/85"
              >
                Open customer website
              </Link>
              <button
                type="button"
                onClick={logout}
                className="w-full rounded-xl bg-white/10 px-4 py-3.5 text-sm font-bold text-white/80"
              >
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-[270px] shrink-0 flex-col overflow-y-auto bg-[#161210] p-4 text-white lg:flex xl:w-[290px] xl:p-5">
          <div className="mb-5 flex items-center gap-3 px-1">
            <BrandLogo size="sm" href="/admin" />
            <div>
              <p className="font-[family-name:var(--font-oswald)] text-lg tracking-wide">
                Shop manager
              </p>
              <p className="text-[11px] text-white/45">
                Simple controls for your pizza shop
              </p>
            </div>
          </div>

          {renderGroup("Daily work", DAILY)}
          {renderGroup("Food & deals", FOOD)}
          {renderGroup("Website look", WEBSITE)}

          <div className="mt-auto space-y-3 pt-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
              <p className="text-[10px] font-bold tracking-wide text-pam-gold uppercase">
                Signed in as
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-white">
                {user?.name || "Admin"}
              </p>
              <p className="truncate text-[11px] text-white/45">
                {user?.email || "admin@palmpizza.com"}
              </p>
            </div>
            <Link
              href="/"
              className="block rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-bold text-white/85 transition hover:bg-white/10"
            >
              View customer website →
            </Link>
            <button
              type="button"
              onClick={logout}
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white/75 transition hover:bg-white/15"
            >
              Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-40 hidden items-center justify-between gap-3 border-b border-pam-border/80 bg-white/95 px-6 py-2.5 backdrop-blur lg:flex xl:px-8">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-pam-ink">
                Shop manager
              </p>
              <p className="truncate text-[11px] font-semibold text-pam-muted">
                {settings.company_name} · new orders and messages
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-xl bg-pam-sand px-3 py-2 text-[12px] font-bold text-pam-ink hover:bg-pam-gold-soft"
              >
                View shop
              </Link>
              <AdminNotifications tone="light" />
            </div>
          </div>
          <div className="px-3 pb-24 pt-4 sm:px-5 sm:pt-5 md:px-6 md:py-7 lg:px-8 lg:pb-8 lg:pt-6">
            {children}
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-pam-border/80 bg-white/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5">
          {MOBILE_NAV.map(({ href, Icon, short }) => (
            <Link
              key={href}
              href={href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-bold ${
                isActive(href) ? "text-pam-red" : "text-pam-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{short}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
