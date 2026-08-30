"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import BrandLogo from "@/components/BrandLogo";
import Newsletter from "@/components/Newsletter";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { ClockIcon, PizzaIcon, ScooterIcon } from "@/components/icons";

const MENU = [
  { href: "/pizzas", label: "Pizzas" },
  { href: "/burgers", label: "Burgers" },
  { href: "/sides", label: "Sides" },
  { href: "/drinks", label: "Drinks" },
  { href: "/combos", label: "Combos" },
  { href: "/offers", label: "Offers" },
];

const COMPANY = [
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/account", label: "Account" },
  { href: "/orders", label: "My Orders" },
  { href: "/cart", label: "Cart" },
];

const POLICIES = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refund", label: "Refunds" },
];

function SocialIcon({
  label,
  href,
  children,
}: {
  label: string;
  href: string;
  children: ReactNode;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 text-white/80 transition hover:border-pam-gold hover:text-pam-gold"
    >
      {children}
    </a>
  );
}

export default function Footer() {
  const { settings } = useSiteSettings();
  return (
    <footer className="pb-24 md:pb-0">
      <Newsletter />

      <div className="border-t border-pam-border bg-pam-ink text-white">
        <div className="mx-auto max-w-[1100px] px-5 pt-10 pb-8 md:px-8 md:pt-12 md:pb-10">
          <div className="mb-10 grid gap-3 sm:grid-cols-3">
            {[
              {
                Icon: PizzaIcon,
                title: "Made to order",
                copy: "Baked when you order",
              },
              {
                Icon: ScooterIcon,
                title: "Delivery in Kigali",
                copy: "Usually about 30 minutes",
              },
              {
                Icon: ClockIcon,
                title: "Hours",
                copy: settings.open_hours,
              },
            ].map(({ Icon, title, copy }) => (
              <div
                key={title}
                className="flex items-center gap-3 rounded-lg border border-white/15 px-4 py-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pam-red text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-[family-name:var(--font-oswald)] text-base text-white">
                    {title}
                  </p>
                  <p className="text-xs text-white/60">{copy}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr] lg:gap-12">
            <div>
              <BrandLogo size="lg" />
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">
                {settings.footer_blurb}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {settings.promo_badge && (
                  <span className="rounded-full border border-pam-gold/30 bg-pam-gold/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-pam-gold">
                    {settings.promo_badge}
                  </span>
                )}
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/70">
                  {settings.phone}
                </span>
              </div>

              <div className="mt-7 flex flex-wrap gap-2.5">
                <SocialIcon label="Instagram" href={settings.social_instagram}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                  </svg>
                </SocialIcon>
                <SocialIcon label="TikTok" href={settings.social_tiktok}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M16.5 4c.4 1.9 1.7 3.4 3.5 4v2.4c-1.4-.1-2.7-.5-3.8-1.2v6.3a5.8 5.8 0 11-5.8-5.8c.3 0 .6 0 .9.1v2.6a3.2 3.2 0 103.2 3.2V4h1.9z" />
                  </svg>
                </SocialIcon>
                <SocialIcon label="X / Twitter" href={settings.social_twitter}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M18.2 3H21l-6.6 7.5L22 21h-5.8l-4.5-5.9L6.4 21H3.6l7-8L2 3h5.9l4.1 5.4L18.2 3zm-1 16.2h1.6L7 4.7H5.3l11.9 14.5z" />
                  </svg>
                </SocialIcon>
                <SocialIcon label="WhatsApp" href={settings.social_whatsapp}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M12 3a9 9 0 00-7.8 13.4L3 21l4.8-1.3A9 9 0 1012 3zm0 16.4a7.4 7.4 0 01-3.8-1l-.3-.2-2.8.7.7-2.7-.2-.3a7.4 7.4 0 116.4 3.5zm4.1-5.5c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.7.9-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.4.1-.5l.4-.5c.1-.1.1-.3.1-.4 0-.1 0-.3-.1-.4-.1-.1-.5-1.3-.7-1.7-.2-.5-.4-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.5.5.2 1 .4 1.3.5.6.2 1.1.2 1.5.1.5-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1-.1-.1-.2-.1-.4-.2z" />
                  </svg>
                </SocialIcon>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-6 lg:contents">
              <FooterCol title="Menu" links={MENU} />
              <FooterCol title="Company" links={COMPANY} />
              <FooterCol title="Policies" links={POLICIES} />
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-3 border-t border-white/15 pt-6 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-white/50">
              © {new Date().getFullYear()} {settings.company_name} ·{" "}
              {settings.email}
            </p>
            <p className="text-sm text-white/70">{settings.company_tagline}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="font-[family-name:var(--font-oswald)] text-base text-white sm:text-lg">
        {title}
      </p>
      <div className="mt-3 space-y-2 text-sm sm:mt-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block text-white/75 transition hover:text-white hover:underline"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
