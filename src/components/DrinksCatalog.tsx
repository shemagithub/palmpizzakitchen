"use client";

import ProductCard from "@/components/ProductCard";
import { useMenu } from "@/components/MenuProvider";

export default function DrinksCatalog() {
  const { drinks, loading } = useMenu();

  return (
    <section className="bg-pam-warm py-10 md:py-14">
      <div className="mx-auto max-w-[1600px] px-5 md:px-8">
        {loading && !drinks.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-3xl bg-pam-sand"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {drinks.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        )}
        {!loading && !drinks.length && (
          <p className="py-16 text-center text-pam-muted">
            No drinks available.
          </p>
        )}
      </div>
    </section>
  );
}
