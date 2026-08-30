"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { resolveMediaUrl } from "@/lib/api";
import { parseOrderCta } from "@/lib/homeContent";

export default function OrderCTA() {
  const { settings } = useSiteSettings();
  const cta = useMemo(() => parseOrderCta(settings.order_cta), [settings.order_cta]);
  const imageSrc = resolveMediaUrl(cta.image);
  const useNext =
    imageSrc.includes("images.unsplash.com") || imageSrc.startsWith("/");

  return (
    <section className="border-t border-pam-border bg-pam-sand">
      <div className="mx-auto grid max-w-[1100px] md:grid-cols-2">
        <div className="relative min-h-[240px] md:min-h-[320px]">
          {useNext ? (
            <Image
              src={imageSrc}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              quality={70}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
        <div className="flex flex-col justify-center px-4 py-10 sm:px-6 md:px-10 md:py-12">
          <h2 className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink sm:text-3xl">
            {cta.title}
          </h2>
          <p className="mt-3 text-sm text-pam-muted sm:text-base">{cta.copy}</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link
              href={cta.primary_href || "/pizzas"}
              className="rounded-lg bg-pam-red px-5 py-3 text-sm font-bold text-white"
            >
              {cta.primary_label}
            </Link>
            <Link
              href={cta.secondary_href || "/combos"}
              className="rounded-lg border border-pam-border bg-white px-5 py-3 text-sm font-bold text-pam-ink"
            >
              {cta.secondary_label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
