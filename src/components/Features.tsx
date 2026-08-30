"use client";

import { useMemo } from "react";
import {
  LeafIcon,
  ScooterIcon,
  ShieldIcon,
  SparkIcon,
} from "@/components/icons";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { parseTrustPoints } from "@/lib/homeContent";

const ICONS = [ScooterIcon, LeafIcon, SparkIcon, ShieldIcon] as const;

export default function Features() {
  const { settings } = useSiteSettings();
  const points = useMemo(
    () => parseTrustPoints(settings.trust_points),
    [settings.trust_points],
  );

  return (
    <section className="border-b border-pam-border bg-pam-surface">
      <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-4 px-3 py-8 sm:grid-cols-4 sm:gap-6 sm:px-5 sm:py-10 md:gap-8 md:px-8 md:py-12">
        {points.map(({ label, sub }, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <div key={`${label}-${i}`} className="flex flex-col items-center text-center">
              <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-pam-sand text-pam-red sm:mb-3 sm:h-12 sm:w-12">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <h2 className="font-[family-name:var(--font-oswald)] text-base text-pam-ink sm:text-lg">
                {label}
              </h2>
              <p className="mt-1 text-xs text-pam-muted sm:text-sm">{sub}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
