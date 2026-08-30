"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { HeartIcon } from "@/components/icons";
import ResolvedMenuImage from "@/components/ResolvedMenuImage";
import {
  comboNeedsChoices,
  formatPrice,
  getEnabledSizes,
  goToProduct,
  itemListPrice,
  productPath,
  type MenuItem,
} from "@/data/menu";
import { addToCart } from "@/lib/cart";

type Props = {
  item: MenuItem;
  showBadge?: boolean;
  className?: string;
};

function formatReviews(count: number) {
  if (count >= 1000) {
    const value = count / 1000;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}K+`;
  }
  return String(count);
}

export default function ProductCard({
  item,
  showBadge = true,
  className = "",
}: Props) {
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);
  const sizes = getEnabledSizes(item);
  const needsConfigure = Boolean(sizes || comboNeedsChoices(item));
  const href = productPath(item.id);

  const handleAdd = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (needsConfigure) {
      goToProduct(item.id);
      return;
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
    try {
      await addToCart(item, 1);
    } catch {
      /* keep optimistic UI */
    }
  };

  const handleLike = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked((v) => !v);
  };

  const openDetails = () => {
    goToProduct(item.id);
  };

  const onCardKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDetails();
    }
  };

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`${item.name} - view details`}
      onClick={openDetails}
      onKeyDown={onCardKeyDown}
      className={`soft-card group flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-3xl bg-pam-surface outline-none ring-pam-red/0 transition hover:ring-2 hover:ring-pam-red/25 focus-visible:ring-2 focus-visible:ring-pam-red ${className}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-pam-sand">
        {showBadge && item.badge && (
          <span className="absolute left-3 top-3 z-10 rounded-md bg-pam-red px-2.5 py-1 text-[10px] font-bold tracking-wide text-white">
            {item.badge}
          </span>
        )}
        <button
          type="button"
          aria-label={liked ? "Remove from favorites" : "Save favorite"}
          onClick={handleLike}
          className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm transition ${
            liked ? "text-pam-red" : "text-pam-ink hover:text-pam-red"
          }`}
        >
          <HeartIcon className="h-4 w-4" />
        </button>
        <ResolvedMenuImage
          src={item.image}
          alt={item.name}
          fill
          className="pointer-events-none object-cover transition duration-500 group-hover:scale-[1.04]"
          sizes="(max-width: 768px) 70vw, 25vw"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4 md:p-5">
        <h3 className="font-[family-name:var(--font-oswald)] text-xl leading-tight tracking-[0.02em] text-pam-ink transition group-hover:text-pam-red md:text-[1.35rem]">
          {item.name}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-pam-muted">
          {item.description}
        </p>
        <p className="mt-2.5 flex items-center gap-1.5 text-sm">
          <span className="text-pam-gold" aria-hidden>
            ★
          </span>
          <span className="font-semibold text-pam-ink">
            {item.rating.toFixed(1)}
          </span>
          <span className="text-pam-muted">({formatReviews(item.reviews)})</span>
        </p>

        <div className="mt-auto flex min-w-0 items-center justify-between gap-2 pt-4">
          <p className="min-w-0 shrink font-[family-name:var(--font-oswald)] text-xl text-pam-ink sm:text-2xl md:text-[1.7rem]">
            {sizes ? (
              <span>
                <span className="mr-1 text-[10px] font-bold tracking-wide text-pam-muted uppercase">
                  From
                </span>
                {formatPrice(itemListPrice(item))}
              </span>
            ) : (
              formatPrice(item.price)
            )}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goToProduct(item.id);
              }}
              className="rounded-full bg-pam-sand px-3 py-2 text-[11px] font-bold text-pam-ink transition hover:bg-pam-border"
            >
              Details
            </a>
            <button
              type="button"
              aria-label={
                needsConfigure
                  ? `Choose options for ${item.name}`
                  : added
                    ? `${item.name} added`
                    : `Add ${item.name}`
              }
              onClick={handleAdd}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white transition hover:scale-105 active:scale-95 ${
                added ? "bg-pam-basil" : "bg-pam-red hover:bg-pam-red-deep"
              }`}
            >
              {added ? "✓" : needsConfigure ? "↗" : "+"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
