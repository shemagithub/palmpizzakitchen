"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { resolveMediaUrl } from "@/lib/api";
import { parseComboBanner } from "@/lib/homeContent";

type Props = {
  compact?: boolean;
};

export default function ComboDealBanner({ compact = false }: Props) {
  const { settings } = useSiteSettings();
  const banner = useMemo(
    () => parseComboBanner(settings.combo_banner),
    [settings.combo_banner],
  );
  const imageSrc = resolveMediaUrl(banner.image);
  const useNextImage =
    imageSrc.includes("images.unsplash.com") || imageSrc.startsWith("/");

  return (
    <section className="overflow-hidden rounded-xl border border-pam-border bg-white">
      <div
        className={`relative ${compact ? "min-h-[150px]" : "min-h-[200px] md:min-h-[240px]"}`}
      >
        {useNextImage ? (
          <Image
            src={imageSrc}
            alt="Combo deal"
            fill
            className="object-cover opacity-40"
            sizes="100vw"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt="Combo deal"
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-pam-sand via-pam-sand/90 to-transparent" />
        <div
          className={`relative z-10 flex items-center justify-between gap-3 ${
            compact ? "p-5" : "p-6 md:p-10"
          }`}
        >
          <div className="min-w-0">
            <p className={`text-sm font-bold text-pam-red ${compact ? "text-xs" : ""}`}>
              {banner.eyebrow}
            </p>
            <h3
              className={`mt-1 font-[family-name:var(--font-oswald)] leading-tight text-pam-ink ${
                compact
                  ? "max-w-[11rem] text-2xl"
                  : "max-w-md text-3xl md:text-4xl"
              }`}
            >
              {banner.title}
            </h3>
            <p
              className={`mt-1 text-pam-muted ${
                compact ? "text-xs" : "text-sm md:text-base"
              }`}
            >
              {banner.copy}
            </p>
            <Link
              href={banner.href || "/combos"}
              className={`mt-3 inline-flex rounded-lg bg-pam-red font-bold text-white ${
                compact ? "px-3.5 py-2 text-xs" : "mt-5 px-5 py-2.5 text-sm"
              }`}
            >
              {banner.cta}
            </Link>
          </div>
          {banner.badge ? (
            <span
              className={`shrink-0 rounded-lg border border-pam-red/20 bg-pam-red/10 px-3 py-2 text-center font-[family-name:var(--font-oswald)] text-pam-red ${
                compact ? "text-sm" : "text-base md:text-lg"
              }`}
            >
              {banner.badge}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
