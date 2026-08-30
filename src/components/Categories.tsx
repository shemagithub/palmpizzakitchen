"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useMenu } from "@/components/MenuProvider";
import { CATEGORIES } from "@/data/menu";
import { resolveMediaUrl } from "@/lib/api";

export default function Categories() {
  const { pizzas, loading } = useMenu();

  const cats = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const live = pizzas.find((p) => p.category === cat.slug);
      const image = live?.image || cat.image;
      return { ...cat, image: resolveMediaUrl(image) };
    });
  }, [pizzas]);

  return (
    <section className="border-y border-pam-border bg-pam-warm py-10 sm:py-14">
      <div className="mx-auto max-w-[1100px] px-3 sm:px-5 md:px-8">
        <div className="mb-6 max-w-xl sm:mb-8">
          <h2 className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink sm:text-3xl">
            Browse by style
          </h2>
          <p className="mt-2 text-sm text-pam-muted sm:text-base">
            Classic, cheesy, veggie, or meat — same menu, sorted by what you
            feel like.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {cats.map((cat) => {
            const src = cat.image;
            const nextOk =
              src.includes("images.unsplash.com") ||
              src.startsWith("/") ||
              src.includes("backend.palmpizzakitchen.com");
            return (
              <Link
                key={cat.slug}
                href={cat.href}
                className="group overflow-hidden rounded-lg border border-pam-border bg-white transition hover:border-pam-red/40"
              >
                <div className="relative aspect-square bg-pam-sand">
                  {loading && !pizzas.length ? (
                    <div className="absolute inset-0 animate-pulse bg-pam-sand" />
                  ) : nextOk ? (
                    <Image
                      src={src}
                      alt={cat.title}
                      fill
                      className="object-cover transition group-hover:scale-[1.02]"
                      sizes="(max-width: 640px) 45vw, 220px"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={cat.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="px-3 py-3 sm:px-4 sm:py-4">
                  <h3 className="font-[family-name:var(--font-oswald)] text-base text-pam-ink sm:text-lg">
                    {cat.title}
                  </h3>
                  <p className="mt-1 text-xs text-pam-muted group-hover:text-pam-red">
                    View menu →
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
