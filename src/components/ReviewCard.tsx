"use client";

import type { TestimonialItem } from "@/lib/homeContent";

const AVATAR_TONES = ["bg-pam-red", "bg-pam-ink", "bg-pam-basil"] as const;

function initials(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

function clampRating(rating: number) {
  return Math.min(5, Math.max(1, Number(rating) || 5));
}

export function StarRow({
  rating,
  size = "sm",
  className = "",
}: {
  rating: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const value = clampRating(rating);
  return (
    <p
      className={`text-pam-gold ${size === "md" ? "text-base tracking-wider" : "text-xs tracking-wide"} ${className}`}
      aria-label={`${value} out of 5 stars`}
    >
      {"★".repeat(value)}
      <span className="text-pam-border/80">{"☆".repeat(5 - value)}</span>
    </p>
  );
}

export default function ReviewCard({
  review,
  index = 0,
  compact = false,
  className = "",
}: {
  review: TestimonialItem;
  index?: number;
  compact?: boolean;
  className?: string;
}) {
  const name = review.name.trim() || "Customer";
  const area = review.area.trim() || "Kigali";
  const quote = review.quote.trim() || "…";
  const tone = AVATAR_TONES[index % AVATAR_TONES.length];

  if (compact) {
    return (
      <figure
        className={`flex items-center gap-3 rounded-lg border border-pam-border bg-white px-3 py-2.5 ${className}`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-[family-name:var(--font-oswald)] text-xs font-bold text-white ${tone}`}
          aria-hidden
        >
          {initials(name)}
        </div>
        <figcaption className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-pam-ink">{name}</p>
          <p className="truncate text-xs text-pam-muted">{area}</p>
        </figcaption>
        <StarRow rating={review.rating} />
      </figure>
    );
  }

  return (
    <figure
      className={`relative flex h-full flex-col overflow-hidden rounded-xl border border-pam-border bg-white p-4 sm:p-5 ${className}`}
    >
      <span
        className="pointer-events-none absolute top-3 right-4 font-[family-name:var(--font-oswald)] text-4xl leading-none text-pam-sand select-none"
        aria-hidden
      >
        “
      </span>

      <div className="relative flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-[family-name:var(--font-oswald)] text-sm font-bold text-white shadow-sm ${tone}`}
          aria-hidden
        >
          {initials(name)}
        </div>
        <figcaption className="min-w-0">
          <p className="truncate text-sm font-bold text-pam-ink sm:text-base">
            {name}
          </p>
          <p className="text-xs text-pam-muted">{area}</p>
        </figcaption>
      </div>

      <blockquote className="relative mt-4 flex-1 text-sm leading-relaxed text-pam-ink/85 sm:text-[0.95rem]">
        {quote}
      </blockquote>

      <div className="relative mt-4 border-t border-pam-border/80 pt-3">
        <StarRow rating={review.rating} size="md" />
      </div>
    </figure>
  );
}

export function averageRating(reviews: TestimonialItem[]) {
  if (!reviews.length) return 0;
  const sum = reviews.reduce(
    (total, row) => total + clampRating(row.rating),
    0,
  );
  return Math.round((sum / reviews.length) * 10) / 10;
}
