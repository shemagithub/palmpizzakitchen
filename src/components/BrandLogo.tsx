"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { resolveMediaUrl } from "@/lib/api";

type Props = {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  href?: string | null;
  priority?: boolean;
};

const SIZES = {
  xs: { width: 44, height: 44, className: "h-10 w-10" },
  sm: { width: 56, height: 56, className: "h-12 w-12" },
  md: {
    width: 88,
    height: 88,
    className: "h-16 w-16 md:h-[4.5rem] md:w-[4.5rem]",
  },
  lg: { width: 140, height: 140, className: "h-24 w-24 md:h-28 md:w-28" },
} as const;

const FALLBACK_LOGO = "/logo.png";

export function resolveLogoSrc(logoUrl?: string | null) {
  const raw = String(logoUrl || "").trim() || FALLBACK_LOGO;
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:")
  ) {
    return raw;
  }
  if (raw.startsWith("/uploads/")) return resolveMediaUrl(raw);
  return raw;
}

/** Tab / bookmark icon follows the logo from Shop settings. */
export function DocumentBrandIcons() {
  const { settings } = useSiteSettings();
  const href = resolveLogoSrc(settings.logo_url);

  useEffect(() => {
    const rels = ["icon", "shortcut icon", "apple-touch-icon"] as const;
    for (const rel of rels) {
      const nodes = document.querySelectorAll<HTMLLinkElement>(
        `link[rel="${rel}"]`,
      );
      if (nodes.length) {
        nodes.forEach((node) => {
          node.href = href;
          node.type = "image/png";
        });
      } else {
        const link = document.createElement("link");
        link.rel = rel;
        link.href = href;
        link.type = "image/png";
        document.head.appendChild(link);
      }
    }
  }, [href]);

  return null;
}

export default function BrandLogo({
  size = "md",
  className = "",
  href = "/",
  priority = false,
}: Props) {
  const { settings, loading } = useSiteSettings();
  const dims = SIZES[size];
  const alt = settings.company_name || "Palm Pizza Kitchen";
  const fetched = resolveLogoSrc(settings.logo_url);
  const [src, setSrc] = useState(fetched);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
    setSrc(fetched);
  }, [fetched]);

  const image = (
    <span className={`relative inline-flex shrink-0 ${dims.className}`}>
      {loading && (
        <span
          className="absolute inset-0 animate-pulse rounded-full bg-pam-sand"
          aria-hidden
        />
      )}
      {/* Uploaded logos live on the API host; img handles that without next/image domain rules. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={broken ? FALLBACK_LOGO : src}
        alt={alt}
        width={dims.width}
        height={dims.height}
        className={`relative ${dims.className} object-contain ${className}`}
        {...(priority ? { fetchPriority: "high" as const } : {})}
        onError={() => {
          if (!broken && src !== FALLBACK_LOGO) setBroken(true);
        }}
      />
    </span>
  );

  if (href === null) return image;

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center"
      aria-label={`${alt} home`}
    >
      {image}
    </Link>
  );
}
