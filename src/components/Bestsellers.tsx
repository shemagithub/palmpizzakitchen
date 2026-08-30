"use client";

import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import SwipeCarousel from "@/components/SwipeCarousel";
import { useMenu } from "@/components/MenuProvider";

export default function Bestsellers() {
  const { pizzas, loading } = useMenu();
  const items = pizzas.slice(0, 6);

  return (
    <section className="border-y border-pam-border bg-pam-sand py-10 sm:py-14 md:py-20">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-5 md:px-8">
        <div className="mb-5 flex items-end justify-between gap-3 sm:mb-8 md:mb-10">
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-oswald)] text-2xl tracking-[0.04em] text-pam-ink sm:text-3xl md:text-4xl">
              Popular Picks
            </h2>
            <p className="mt-1 max-w-md text-sm text-pam-muted sm:mt-2 sm:text-base">
              The pizzas people order again and again.
            </p>
          </div>
          <Link
            href="/pizzas"
            className="shrink-0 text-sm font-bold text-pam-red transition hover:underline"
          >
            View All →
          </Link>
        </div>

        {loading && !items.length ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[320px] w-[min(78vw,280px)] shrink-0 animate-pulse rounded-3xl bg-pam-warm sm:w-[260px]"
              />
            ))}
          </div>
        ) : (
          <SwipeCarousel
            itemWidth={260}
            gap={14}
            bleed
            showArrows
            showDots
            ariaLabel="Popular picks"
          >
            {items.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                className="w-[min(78vw,280px)] shrink-0 sm:w-[260px] md:w-[280px]"
              />
            ))}
          </SwipeCarousel>
        )}
      </div>
    </section>
  );
}
