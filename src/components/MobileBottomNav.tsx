"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ProfileMenu from "@/components/ProfileMenu";
import {
  GridIcon,
  HomeIcon,
  PizzaIcon,
  TagIcon,
} from "@/components/icons";
import { useCartCount } from "@/hooks/useCartCount";

const LEFT = [
  { label: "Home", href: "/", Icon: HomeIcon },
  { label: "Menu", href: "/pizzas", Icon: GridIcon },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const cartCount = useCartCount();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-pam-border/70 bg-white/95 px-4 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
    >
      <div className="relative mx-auto flex max-w-md items-end justify-between">
        {LEFT.map(({ label, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex w-14 flex-col items-center gap-1 pb-1 ${
              isActive(href) ? "text-pam-red" : "text-pam-muted"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[11px] font-semibold">{label}</span>
          </Link>
        ))}

        <Link
          href="/cart"
          className="-mt-8 relative flex w-16 flex-col items-center gap-1"
        >
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-pam-red text-white shadow-[0_10px_24px_rgba(227,24,55,0.4)] ring-4 ring-[#f7f4ef]">
            <PizzaIcon className="h-7 w-7" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-pam-ink px-1 text-[10px] font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </span>
          <span className="text-[11px] font-bold text-pam-ink">Cart</span>
        </Link>

        <Link
          href="/offers"
          className={`flex w-14 flex-col items-center gap-1 pb-1 ${
            isActive("/offers") ? "text-pam-red" : "text-pam-muted"
          }`}
        >
          <TagIcon className="h-5 w-5" />
          <span className="text-[11px] font-semibold">Offers</span>
        </Link>

        <ProfileMenu variant="bottom" />
      </div>
    </nav>
  );
}
