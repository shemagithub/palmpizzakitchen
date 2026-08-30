"use client";

import { useSiteSettings } from "@/components/SiteSettingsProvider";

type Props = {
  title: string;
  subtitle?: string;
};

export default function PageHero({ title, subtitle }: Props) {
  const { settings } = useSiteSettings();
  const eyebrow = settings.company_name || "Palm Pizza Kitchen";

  return (
    <section className="border-b border-pam-border bg-pam-sand">
      <div className="mx-auto max-w-[1600px] px-5 py-12 md:px-8 md:py-16">
        <p className="mb-2 text-sm font-bold text-pam-red">{eyebrow}</p>
        <h1 className="font-[family-name:var(--font-oswald)] text-4xl text-pam-ink md:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-2xl text-base text-pam-muted md:text-lg">
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  );
}
