"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { useMenu } from "@/components/MenuProvider";
import { ALCOHOL_KINDS, normalizeAlcoholKind } from "@/data/menu";

const FILTERS = [{ id: "all", label: "All" }, ...ALCOHOL_KINDS] as const;

export default function AlcoholCatalog() {
  const { alcohol, loading } = useMenu();
  const [kind, setKind] = useState<(typeof FILTERS)[number]["id"]>("all");

  const visible = useMemo(() => {
    if (kind === "all") return alcohol;
    return alcohol.filter(
      (item) => (normalizeAlcoholKind(item.details?.alcoholKind) || "other") === kind,
    );
  }, [alcohol, kind]);

  return (
    <section className="bg-pam-warm py-10 md:py-14">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-5 md:px-8">
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-pam-ink ring-1 ring-pam-border">
          Wine, champagne, beer, and other alcohol are for guests 18 and over.
          Soft drinks, juice, and water are on the{" "}
          <Link href="/drinks" className="font-bold text-pam-red underline">
            Drinks
          </Link>{" "}
          page.
        </p>

        <div className="no-scrollbar -mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map((filter) => {
            const count =
              filter.id === "all"
                ? alcohol.length
                : alcohol.filter(
                    (item) =>
                      (normalizeAlcoholKind(item.details?.alcoholKind) ||
                        "other") === filter.id,
                  ).length;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setKind(filter.id)}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold transition ${
                  kind === filter.id
                    ? "bg-pam-red text-white"
                    : "bg-white text-pam-muted ring-1 ring-pam-border"
                }`}
              >
                {filter.label}
                <span className="ml-1 opacity-80">{count}</span>
              </button>
            );
          })}
        </div>

        {loading && !alcohol.length ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-3xl bg-pam-sand"
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {visible.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        )}
        {!loading && !visible.length && (
          <p className="py-16 text-center text-pam-muted">
            {alcohol.length
              ? "Nothing in this group yet."
              : "No wine or alcohol on the menu right now."}
          </p>
        )}
      </div>
    </section>
  );
}
