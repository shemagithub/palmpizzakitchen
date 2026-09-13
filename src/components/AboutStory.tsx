"use client";

import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { resolveMediaUrl } from "@/lib/api";

export default function AboutStory() {
  const { settings } = useSiteSettings();
  const title = settings.about_story_title;
  const image = settings.about_story_image;
  const photo = image
    ? image.startsWith("/uploads/")
      ? resolveMediaUrl(image)
      : image
    : "";
  const facts = [
    settings.open_hours ? `Open daily ${settings.open_hours}` : "",
    settings.promo_badge,
    settings.address,
    settings.phone,
  ].filter(Boolean);

  if (!title && !settings.about_text && !photo && !facts.length) return null;

  return (
    <section className="bg-pam-warm py-14 md:py-20">
      <div className="mx-auto grid max-w-[1600px] items-center gap-10 px-5 md:grid-cols-2 md:px-8">
        {photo ? (
          <div className="relative aspect-[4/3] overflow-hidden border border-pam-border bg-pam-sand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt={`${settings.company_name || "Palm Pizza"} kitchen`}
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
        <div>
          {title ? (
            <h2 className="font-[family-name:var(--font-oswald)] text-3xl tracking-[0.04em] text-pam-ink md:text-4xl">
              {title}
            </h2>
          ) : null}
          {settings.about_text ? (
            <p className="mt-4 leading-relaxed text-pam-muted">
              {settings.about_text}
            </p>
          ) : null}
          {facts.length ? (
            <ul className="mt-6 space-y-2 text-pam-ink/80">
              {facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
