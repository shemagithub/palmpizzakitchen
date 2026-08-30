"use client";

import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import SwipeCarousel from "@/components/SwipeCarousel";
import ComboDealBanner from "@/components/ComboDealBanner";
import { useMenu } from "@/components/MenuProvider";

export default function CombosSides() {
  const { combos, sides } = useMenu();

  return (
    <section className="bg-pam-warm py-10 sm:py-14 md:py-20">
      <div className="mx-auto max-w-[1600px] space-y-10 px-3 sm:space-y-14 sm:px-5 md:px-8">
        <div>
          <div className="mb-4 flex items-end justify-between gap-3 sm:mb-6">
            <h2 className="font-[family-name:var(--font-oswald)] text-2xl tracking-[0.04em] text-pam-ink md:text-3xl">
              Combos
            </h2>
            <Link
              href="/combos"
              className="text-sm font-bold text-pam-red transition hover:underline"
            >
              View All →
            </Link>
          </div>
          <SwipeCarousel
            itemWidth={260}
            gap={14}
            bleed
            showArrows
            showDots
            ariaLabel="Combo meals"
          >
            {combos.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                className="w-[min(78vw,280px)] shrink-0 sm:w-[260px] md:w-[280px]"
              />
            ))}
          </SwipeCarousel>
        </div>

        <ComboDealBanner />

        <div>
          <div className="mb-4 flex items-end justify-between gap-3 sm:mb-6">
            <h2 className="font-[family-name:var(--font-oswald)] text-2xl tracking-[0.04em] text-pam-ink md:text-3xl">
              Sides
            </h2>
            <Link
              href="/sides"
              className="text-sm font-bold text-pam-red transition hover:underline"
            >
              View All →
            </Link>
          </div>
          <SwipeCarousel
            itemWidth={260}
            gap={14}
            bleed
            showArrows
            showDots
            ariaLabel="Sides"
          >
            {sides.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                className="w-[min(78vw,280px)] shrink-0 sm:w-[260px] md:w-[280px]"
              />
            ))}
          </SwipeCarousel>
        </div>
      </div>
    </section>
  );
}
