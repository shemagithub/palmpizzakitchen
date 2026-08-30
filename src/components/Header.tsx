"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import ProfileMenu from "@/components/ProfileMenu";
import { BagIcon, CloseIcon, MenuIcon } from "@/components/icons";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { useCartCount } from "@/hooks/useCartCount";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Pizzas", href: "/pizzas" },
  { label: "Burgers", href: "/burgers" },
  { label: "Sides", href: "/sides" },
  { label: "Drinks", href: "/drinks" },
  { label: "Combos", href: "/combos" },
  { label: "Offers", href: "/offers" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { settings } = useSiteSettings();
  const cartCount = useCartCount();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-pam-border/70 bg-pam-surface/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-5 py-2.5 md:px-8">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" priority />
          <div className="hidden lg:block">
            <p className="brand-script text-[1.65rem] text-pam-ink">
              {settings.company_name}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-pam-muted">
              {settings.company_tagline}
            </p>
          </div>
        </div>

        <nav className="hidden items-center gap-2 rounded-full bg-pam-sand/70 p-1 shadow-sm lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[0.95rem] transition ${
                isActive(item.href)
                  ? "rounded-full bg-pam-red px-4 py-2 text-white shadow-[0_10px_25px_rgba(227,24,55,0.25)]"
                  : "rounded-full px-4 py-2 font-semibold text-pam-muted hover:bg-white/60 hover:text-pam-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ProfileMenu variant="header" />
          <Link
            href="/cart"
            aria-label={
              cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"
            }
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-pam-muted transition hover:bg-pam-sand hover:text-pam-ink"
          >
            <BagIcon className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pam-red px-1 text-[10px] font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
          <Link
            href="/pizzas"
            className="ml-1 hidden rounded-sm bg-pam-red px-4 py-2.5 text-sm font-bold text-white transition hover:bg-pam-red-deep sm:inline-flex"
          >
            Order now
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            className="text-pam-ink lg:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <CloseIcon className="h-6 w-6" />
            ) : (
              <MenuIcon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-pam-border bg-pam-sand px-5 py-5 lg:hidden">
          <nav className="flex flex-col gap-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`text-lg ${
                  isActive(item.href)
                    ? "font-bold text-pam-red"
                    : "text-pam-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/pizzas"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex w-fit rounded-sm bg-pam-red px-5 py-2.5 text-sm font-bold text-white"
            >
              Order now
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
