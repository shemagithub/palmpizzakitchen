"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CategoryTabs from "@/components/CategoryTabs";
import ProductCard from "@/components/ProductCard";
import { useMenu } from "@/components/MenuProvider";
import { CATEGORIES } from "@/data/menu";

function PizzaGrid() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || undefined;
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const { pizzas, loading } = useMenu();
  let items = category
    ? pizzas.filter((p) => p.category === category)
    : pizzas;
  if (q) {
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }

  if (loading && !items.length) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] animate-pulse rounded-3xl bg-pam-sand"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {q && (
        <p className="mb-4 text-sm text-pam-muted">
          Results for <span className="font-bold text-pam-ink">“{q}”</span>
          {items.length ? ` · ${items.length} found` : ""}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <ProductCard key={item.id} item={item} />
        ))}
      </div>
      {items.length === 0 && (
        <p className="py-16 text-center text-pam-muted">
          {q
            ? "No pizzas match your search."
            : "No pizzas found in this category."}
        </p>
      )}
    </>
  );
}

export default function PizzasCatalog() {
  return (
    <section className="bg-pam-warm py-10 md:py-14">
      <div className="mx-auto max-w-[1600px] px-5 md:px-8">
        <Suspense
          fallback={<div className="mb-8 h-10 border-b border-pam-border" />}
        >
          <CategoryTabs categories={CATEGORIES} />
        </Suspense>
        <Suspense
          fallback={
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] animate-pulse rounded-3xl bg-pam-sand"
                />
              ))}
            </div>
          }
        >
          <PizzaGrid />
        </Suspense>
      </div>
    </section>
  );
}
