"use client";

import ProductCard from "@/components/ProductCard";
import SwipeCarousel from "@/components/SwipeCarousel";
import type { MenuItem } from "@/data/menu";

type Props = {
  items: MenuItem[];
};

export default function RelatedProducts({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <SwipeCarousel
      itemWidth={240}
      gap={16}
      showArrows
      showDots
      ariaLabel="Related products"
    >
      {items.map((item) => (
        <ProductCard
          key={item.id}
          item={item}
          className="w-[220px] shrink-0 sm:w-[240px] lg:w-[260px]"
        />
      ))}
    </SwipeCarousel>
  );
}
