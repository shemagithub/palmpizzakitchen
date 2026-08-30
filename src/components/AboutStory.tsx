"use client";

import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { resolveMediaUrl } from "@/lib/api";

export default function AboutStory() {
  const { settings } = useSiteSettings();
  const title = settings.about_story_title;
  const image = settings.about_story_image;
  const photo = image.startsWith("/uploads/") ? resolveMediaUrl(image) : image;

  return (
    <section className="bg-pam-warm py-14 md:py-20">
      <div className="mx-auto grid max-w-[1600px] items-center gap-10 px-5 md:grid-cols-2 md:px-8">
        <div className="relative aspect-[4/3] overflow-hidden border border-pam-border bg-pam-sand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt={`${settings.company_name} kitchen`}
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-oswald)] text-3xl tracking-[0.04em] text-pam-ink md:text-4xl">
            {title}
          </h2>
          <p className="mt-4 leading-relaxed text-pam-muted">
            {settings.about_text}
          </p>
          <ul className="mt-6 space-y-2 text-pam-ink/80">
            <li>Open daily {settings.open_hours}</li>
            <li>{settings.promo_badge || "Free delivery nearby"}</li>
            <li>{settings.address}</li>
            <li>{settings.phone}</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
