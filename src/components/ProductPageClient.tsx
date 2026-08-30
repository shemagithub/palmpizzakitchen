"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ProductDetailPanel from "@/components/ProductDetailPanel";
import ProductGallery from "@/components/ProductGallery";
import RelatedProducts from "@/components/RelatedProducts";
import { useMenu } from "@/components/MenuProvider";
import {
  getProductDetails,
  getProductImages,
  normalizeComboSlots,
  normalizeSizePrices,
  type MenuItem,
} from "@/data/menu";
import { api } from "@/lib/api";

function idFromPath(pathname: string | null, fallback: string) {
  const match = String(pathname || "").match(/\/product\/([^/]+)/);
  if (match?.[1]) {
    const raw = decodeURIComponent(match[1]);
    if (raw && raw !== "__view__") return raw;
  }
  return fallback === "__view__" ? "" : fallback;
}

export default function ProductPageClient({ id: propId }: { id: string }) {
  const pathname = usePathname();
  const id = useMemo(
    () => idFromPath(pathname, propId) || propId,
    [pathname, propId],
  );
  const { getById, related, loading: menuLoading, refresh } = useMenu();
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!id || id === "__view__") {
      setMissing(true);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setMissing(false);

      // Instant paint from menu list if already loaded
      const fromCtx = getById(id);
      if (fromCtx && !cancelled) {
        setItem(fromCtx);
        setLoading(false);
      }

      // Always refresh this product from the database/API
      try {
        const data = await api<{ item: MenuItem }>(`/menu/${id}`);
        if (!cancelled && data.item) {
          const details =
            data.item.details && typeof data.item.details === "object"
              ? { ...data.item.details }
              : undefined;
          if (details) {
            const sizes = normalizeSizePrices(details.sizes);
            if (sizes) details.sizes = sizes;
            else delete details.sizes;
            const slots = normalizeComboSlots(details.comboSlots);
            if (slots) details.comboSlots = slots;
            else delete details.comboSlots;
          }
          setItem({
            ...data.item,
            price: Number(data.item.price) || 0,
            rating: Number(data.item.rating) || 4.8,
            reviews: Number(data.item.reviews) || 0,
            images: Array.isArray(data.item.images)
              ? data.item.images.filter(Boolean)
              : data.item.image
                ? [data.item.image]
                : undefined,
            details,
          });
          setMissing(false);
          setLoading(false);
          return;
        }
      } catch {
        /* fall through */
      }

      if (!cancelled) {
        if (fromCtx) {
          setItem(fromCtx);
          setMissing(false);
        } else if (!menuLoading) {
          setMissing(true);
        }
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, getById, menuLoading]);

  useEffect(() => {
    if (!menuLoading && !item && id && id !== "__view__") {
      void refresh();
    }
  }, [menuLoading, item, id, refresh]);

  if (loading || (menuLoading && !item && !missing)) {
    return (
      <div className="bg-pam-warm px-3 py-10 sm:px-5 sm:py-14 md:px-8">
        <div className="mx-auto grid w-full max-w-[1600px] gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="aspect-square animate-pulse rounded-2xl bg-pam-sand sm:rounded-3xl" />
          <div className="space-y-4">
            <div className="h-6 w-1/3 animate-pulse rounded bg-pam-sand" />
            <div className="h-10 w-2/3 animate-pulse rounded bg-pam-sand" />
            <div className="h-24 animate-pulse rounded bg-pam-sand" />
            <div className="h-12 w-1/2 animate-pulse rounded bg-pam-sand" />
          </div>
        </div>
      </div>
    );
  }

  if (missing || !item) {
    return (
      <div className="bg-pam-warm px-3 py-16 text-center sm:px-5 sm:py-20 md:px-8">
        <h1 className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink sm:text-3xl">
          Product not found
        </h1>
        <p className="mt-2 text-sm text-pam-muted sm:text-base">
          This item may have been removed from the menu.
        </p>
        <Link
          href="/pizzas"
          className="mt-6 inline-flex rounded-full bg-pam-red px-5 py-3 text-sm font-bold text-white"
        >
          Browse menu
        </Link>
      </div>
    );
  }

  const details = getProductDetails(item);
  const images = getProductImages(item);
  const relatedItems = related(item);
  const parentHref =
    item.category === "side"
      ? "/sides"
      : item.category === "combo"
        ? "/combos"
        : item.category === "drink"
          ? "/drinks"
          : item.category === "burger"
            ? "/burgers"
            : "/pizzas";
  const parentLabel =
    item.category === "side"
      ? "Sides"
      : item.category === "combo"
        ? "Combos"
        : item.category === "drink"
          ? "Drinks"
          : item.category === "burger"
            ? "Burgers"
            : "Pizzas";

  return (
    <div className="overflow-x-clip bg-pam-warm">
      <section className="border-b border-pam-border bg-pam-surface">
        <div className="mx-auto w-full max-w-[1600px] px-3 py-3 sm:px-5 sm:py-4 md:px-8">
          <nav className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-pam-muted sm:text-sm">
            <Link href="/" className="hover:text-pam-ink">
              Home
            </Link>
            <span aria-hidden>/</span>
            <Link href={parentHref} className="hover:text-pam-ink">
              {parentLabel}
            </Link>
            <span aria-hidden>/</span>
            <span className="truncate text-pam-ink">{item.name}</span>
          </nav>
        </div>
      </section>

      <section className="py-6 sm:py-10 md:py-12 lg:py-14 xl:py-16">
        <div className="mx-auto grid w-full max-w-[1600px] items-start gap-6 px-3 sm:gap-8 sm:px-5 md:gap-10 md:px-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="min-w-0 lg:sticky lg:top-24">
            <ProductGallery name={item.name} images={images} />
          </div>
          <ProductDetailPanel item={item} details={details} />
        </div>
      </section>

      {relatedItems.length > 0 && (
        <section className="border-t border-pam-border bg-pam-sand py-10 sm:py-12 md:py-16">
          <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-5 md:px-8">
            <div className="mb-5 flex items-end justify-between gap-3 sm:mb-8 sm:gap-4">
              <h2 className="min-w-0 font-[family-name:var(--font-oswald)] text-2xl tracking-[0.04em] text-pam-ink sm:text-3xl">
                You may also like
              </h2>
              <Link
                href={parentHref}
                className="shrink-0 text-xs font-semibold text-pam-red underline-offset-4 hover:underline sm:text-sm"
              >
                Back to menu
              </Link>
            </div>
            <RelatedProducts items={relatedItems} />
          </div>
        </section>
      )}
    </div>
  );
}
