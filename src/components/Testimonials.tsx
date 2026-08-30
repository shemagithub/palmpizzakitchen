"use client";

import SwipeCarousel from "@/components/SwipeCarousel";
import ReviewCard, { StarRow, averageRating } from "@/components/ReviewCard";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { parseTestimonials } from "@/lib/homeContent";
import { useMemo } from "react";

export default function Testimonials() {
  const { settings } = useSiteSettings();
  const reviews = useMemo(
    () => parseTestimonials(settings.testimonials),
    [settings.testimonials],
  );

  if (!reviews.length) return null;

  const avg = averageRating(reviews);

  return (
    <section className="border-y border-pam-border bg-pam-sand/35 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[1100px] px-3 sm:px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink sm:text-3xl md:text-4xl">
              What customers say
            </h2>
            <p className="mt-2 text-sm text-pam-muted md:text-base">
              Feedback from people who order in Kigali.
            </p>
          </div>
          <div className="rounded-xl border border-pam-border bg-white px-4 py-3 text-center sm:text-left">
            <p className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink">
              {avg}
            </p>
            <StarRow rating={Math.round(avg)} className="mt-1 justify-center sm:justify-start" />
            <p className="mt-1 text-[11px] font-semibold text-pam-muted">
              {reviews.length} review{reviews.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mt-10">
          <SwipeCarousel
            itemWidth={300}
            gap={16}
            bleed
            showArrows
            showDots
            ariaLabel="Customer testimonials"
          >
            {reviews.map((review, i) => (
              <div
                key={`${review.name}-${i}`}
                className="h-full w-[min(82vw,300px)] shrink-0 sm:w-[300px]"
              >
                <ReviewCard review={review} index={i} className="h-full" />
              </div>
            ))}
          </SwipeCarousel>
        </div>
      </div>
    </section>
  );
}
