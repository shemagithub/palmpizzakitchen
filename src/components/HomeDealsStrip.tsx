"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ResolvedMenuImage from "@/components/ResolvedMenuImage";
import { PromoSizePriceRowLight } from "@/components/PromoSizePriceRow";
import { api } from "@/lib/api";
import { offerHref, isOrderableOffer, hasOfferPromoPricing, type OfferRecord } from "@/lib/offers";

export default function HomeDealsStrip() {
  const [offers, setOffers] = useState<OfferRecord[]>([]);

  useEffect(() => {
    api<{ offers: OfferRecord[] }>("/offers?home=1")
      .then((data) => setOffers(data.offers || []))
      .catch(() => setOffers([]));
  }, []);

  if (!offers.length) return null;

  return (
    <section className="border-b border-pam-border/60 bg-pam-warm py-8 md:py-10">
      <div className="mx-auto max-w-[1600px] px-5 md:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-pam-red">Today&apos;s deals</p>
            <h2 className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink md:text-3xl">
              Offers on the menu
            </h2>
          </div>
          <Link
            href="/offers"
            className="text-sm font-bold text-pam-red hover:underline"
          >
            All offers →
          </Link>
        </div>

        <div className="swipe-track no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
          {offers.map((offer) => (
            <article
              key={offer.id}
              className="soft-card flex w-[min(88vw,320px)] shrink-0 flex-col overflow-hidden rounded-lg border border-pam-border bg-white sm:w-[300px]"
            >
              <div className="relative aspect-[4/3] bg-pam-sand">
                {offer.image ? (
                  <ResolvedMenuImage
                    src={offer.image}
                    alt={offer.title}
                    fill
                    className="object-cover"
                    sizes="320px"
                  />
                ) : (
                  <div className="absolute inset-0 bg-pam-sand" />
                )}
                {offer.dealLabel ? (
                  <span className="absolute left-3 top-3 rounded-md bg-pam-gold px-2.5 py-1 text-[10px] font-bold text-pam-ink">
                    {offer.dealLabel}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <p className="font-[family-name:var(--font-oswald)] text-lg text-pam-ink">
                  {offer.title}
                </p>
                {offer.description ? (
                  <p className="line-clamp-2 text-sm leading-relaxed text-pam-muted">
                    {offer.description}
                  </p>
                ) : null}
                {hasOfferPromoPricing(offer) ? (
                  <div className="mt-3">
                    <PromoSizePriceRowLight sizes={offer.sizePrices} />
                  </div>
                ) : null}
                <p className="mt-3 inline-flex w-fit rounded-xl bg-pam-sand px-3 py-1.5 font-mono text-xs font-bold tracking-wide">
                  {offer.code}
                </p>
                <p className="mt-2 text-xs text-pam-muted">
                  Until {offer.ends}
                </p>
                <Link
                  href={offerHref(offer)}
                  className="mt-4 inline-flex rounded-full bg-pam-red px-4 py-2.5 text-center text-sm font-bold text-white"
                >
                  {isOrderableOffer(offer) ? "Pick & order →" : "Grab deal →"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
