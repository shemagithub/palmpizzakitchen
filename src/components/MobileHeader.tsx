"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import ProfileMenu from "@/components/ProfileMenu";
import {
  BagIcon,
  CloseIcon,
  MenuIcon,
  SearchIcon,
  SlidersIcon,
  UserIcon,
} from "@/components/icons";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { useAuthUser, userInitials } from "@/hooks/useAuthUser";
import { useCartCount } from "@/hooks/useCartCount";
import { clearSession } from "@/lib/api";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Pizzas", href: "/pizzas" },
  { label: "Burgers", href: "/burgers" },
  { label: "Sides", href: "/sides" },
  { label: "Drinks", href: "/drinks" },
  { label: "Combos", href: "/combos" },
  { label: "Offers", href: "/offers" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Cart", href: "/cart" },
];

export default function MobileHeader() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { settings } = useSiteSettings();
  const cartCount = useCartCount();
  const { user, isLoggedIn } = useAuthUser();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const runSearch = (e?: FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    router.push(q ? `/pizzas?q=${encodeURIComponent(q)}` : "/pizzas");
    setOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#f7f4ef]/95 px-4 pb-3 pt-3 backdrop-blur-md md:hidden">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="soft-card flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-pam-ink"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-2"
            aria-label={`${settings.company_name} home`}
          >
            <BrandLogo size="xs" href={null} priority />
            <span className="brand-script min-w-0 text-[clamp(1rem,4.6vw,1.35rem)] leading-[1.15] text-pam-ink">
              {settings.company_name}
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
            <ProfileMenu variant="mobile" />
            <Link
              href="/cart"
              aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
              className="soft-card relative flex h-11 w-11 items-center justify-center rounded-2xl text-pam-ink"
            >
              <BagIcon className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-pam-red px-1 text-[10px] font-bold text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        <form onSubmit={runSearch} className="flex items-center gap-2">
          <label className="soft-card flex flex-1 items-center gap-2 rounded-full px-4 py-3">
            <SearchIcon className="h-4 w-4 shrink-0 text-pam-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your favorite pizza..."
              className="w-full bg-transparent text-sm text-pam-ink outline-none placeholder:text-pam-muted"
            />
          </label>
          <button
            type="submit"
            aria-label="Search menu"
            className="soft-card flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-pam-ink"
          >
            <SlidersIcon className="h-5 w-5" />
          </button>
        </form>
      </header>

      {/* Full-screen menu popup - above bottom nav */}
      {open && (
        <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu backdrop"
            className="absolute inset-0 bg-pam-black/50 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />

          <div className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-white shadow-2xl animate-fade-up">
            <div className="flex min-w-0 items-center justify-between gap-2 border-b border-pam-border px-4 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <BrandLogo size="xs" href={null} />
                <p className="brand-script min-w-0 text-[clamp(1.05rem,4.5vw,1.4rem)] leading-[1.15] text-pam-ink">
                  {settings.company_name}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pam-sand text-pam-ink"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3">
              {LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl px-4 py-3.5 text-base font-semibold text-pam-ink transition hover:bg-pam-sand active:bg-pam-sand"
                >
                  {item.label}
                </Link>
              ))}
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl px-4 py-3.5 text-base font-semibold text-pam-red transition hover:bg-pam-sand active:bg-pam-sand"
                >
                  Shop manager
                </Link>
              )}
            </nav>

            <div className="space-y-2 border-t border-pam-border p-4">
              {isLoggedIn ? (
                <>
                  <div className="mb-1 flex items-center gap-3 rounded-2xl bg-pam-sand/70 px-3 py-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pam-red font-[family-name:var(--font-oswald)] text-sm font-bold text-white">
                      {userInitials(user)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-pam-ink">
                        {user?.name || "Your account"}
                      </p>
                      <p className="truncate text-xs text-pam-muted">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/account"
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-sm font-semibold text-pam-ink hover:bg-pam-sand"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/orders"
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-sm font-semibold text-pam-ink hover:bg-pam-sand"
                  >
                    My orders
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      clearSession();
                      setOpen(false);
                      router.push("/account");
                    }}
                    className="w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-pam-red hover:bg-pam-red/8"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full bg-pam-red py-3.5 text-sm font-bold text-white"
                >
                  <UserIcon className="h-4 w-4" />
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
