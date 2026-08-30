"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { resolveMediaUrl } from "@/lib/api";
import { parseQuickCategories } from "@/lib/homeContent";

export default function QuickCategories() {
  const pathname = usePathname();
  const { settings } = useSiteSettings();
  const cats = useMemo(
    () => parseQuickCategories(settings.quick_categories),
    [settings.quick_categories],
  );

  if (!cats.length) return null;

  const matching = cats.filter((cat) => {
    if (cat.href === "/") return pathname === "/";
    return pathname === cat.href || pathname.startsWith(`${cat.href}/`);
  });
  const activeId = matching[0]?.id ?? cats[0]?.id;

  return (
    <div className="border-b border-pam-border bg-pam-surface py-5 sm:py-8 md:py-10">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-5 md:px-8">
        <div className="no-scrollbar thumb-track -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 md:hidden">
          {cats.map((cat) => {
            const isActive = activeId === cat.id;
            const src = resolveMediaUrl(cat.image);
            return (
              <Link
                key={cat.id}
                href={cat.href}
                className="flex w-[68px] shrink-0 flex-col items-center gap-1.5"
              >
                <span
                  className={`relative h-[68px] w-[68px] overflow-hidden rounded-full bg-white p-1 ${
                    isActive ? "ring-2 ring-pam-red" : "ring-1 ring-pam-border"
                  }`}
                >
                  <span className="relative block h-full w-full overflow-hidden rounded-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={cat.label}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </span>
                </span>
                <span
                  className={`text-center text-[11px] font-semibold leading-tight ${
                    isActive ? "text-pam-red" : "text-pam-ink"
                  }`}
                >
                  {cat.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="hidden flex-wrap items-center justify-center gap-6 md:flex md:gap-8">
          {cats.map((cat) => {
            const isActive = activeId === cat.id;
            const src = resolveMediaUrl(cat.image);
            const nextOk =
              src.includes("images.unsplash.com") || src.startsWith("/");
            return (
              <Link
                key={cat.id}
                href={cat.href}
                className="group flex w-[100px] flex-col items-center gap-2.5"
              >
                <span
                  className={`relative h-[92px] w-[92px] overflow-hidden rounded-full bg-white p-1.5 shadow-sm transition group-hover:scale-105 ${
                    isActive
                      ? "ring-2 ring-pam-red"
                      : "ring-1 ring-pam-border group-hover:ring-pam-red/40"
                  }`}
                >
                  <span className="relative block h-full w-full overflow-hidden rounded-full">
                    {nextOk ? (
                      <Image
                        src={src}
                        alt={cat.label}
                        fill
                        className="object-cover"
                        sizes="92px"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={cat.label}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                  </span>
                </span>
                <span
                  className={`text-center text-sm font-semibold ${
                    isActive
                      ? "text-pam-red"
                      : "text-pam-ink group-hover:text-pam-red"
                  }`}
                >
                  {cat.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
