"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageHero from "@/components/PageHero";
import ResolvedMenuImage from "@/components/ResolvedMenuImage";
import { PromoSizePriceRowLight } from "@/components/PromoSizePriceRow";
import { api } from "@/lib/api";
import { offerHref, type OfferRecord } from "@/lib/offers";

export default function OffersClient() {
  const [offers, setOffers] = useState<OfferRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ offers: OfferRecord[] }>("/offers")
      .then((data) => setOffers(data.offers || []))
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHero
        title="Offers & deals"
        subtitle="Buy-one-get-one burgers, combo savings, free delivery, and more — tap a deal, copy the code, and order."
      />
      <section className="bg-pam-warm py-10 md:py-14">
        <div className="mx-auto max-w-[1600px] px-5 md:px-8">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-80 animate-pulse rounded-3xl bg-pam-sand"
                />
              ))}
            </div>
          ) : offers.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer) => (
                <article
                  key={offer.id}
                  className="soft-card flex flex-col overflow-hidden rounded-3xl border border-pam-border/70 bg-white"
                >
                  <div className="relative aspect-[16/10] bg-pam-sand">
                    {offer.image ? (
                      <ResolvedMenuImage
                        src={offer.image}
                        alt={offer.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-pam-red to-[#3b1014]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      {offer.dealLabel ? (
                        <span className="rounded-full bg-pam-gold px-3 py-1 text-[10px] font-bold tracking-wide text-pam-ink uppercase">
                          {offer.dealLabel}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold tracking-wide text-white backdrop-blur-sm uppercase">
                        {offer.status}
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <h2 className="font-[family-name:var(--font-oswald)] text-2xl leading-tight text-white md:text-3xl">
                        {offer.title}
                      </h2>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <p className="inline-flex w-fit rounded-xl bg-pam-sand px-3 py-1.5 font-mono text-sm font-bold tracking-wide">
                      Code: {offer.code}
                    </p>
                    {offer.description ? (
                      <p className="mt-4 text-sm leading-relaxed text-pam-ink">
                        {offer.description}
                      </p>
                    ) : null}
                    {offer.sizePrices ? (
                      <div className="mt-4">
                        <p className="mb-2 text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                          Promo prices
                        </p>
                        <PromoSizePriceRowLight sizes={offer.sizePrices} />
                      </div>
                    ) : null}
                    {offer.terms ? (
                      <p className="mt-3 text-xs leading-relaxed text-pam-muted">
                        {offer.terms}
                      </p>
                    ) : null}
                    <p className="mt-4 text-sm font-semibold text-pam-muted">
                      Valid until {offer.ends}
                    </p>
                    <Link
                      href={offerHref(offer)}
                      className="mt-6 inline-flex rounded-full bg-pam-red px-5 py-3 text-sm font-bold text-white"
                    >
                      Order with this deal →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-pam-border bg-white px-6 py-16 text-center">
              <p className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink">
                No active offers right now
              </p>
              <p className="mt-2 text-sm text-pam-muted">
                Check back soon — or browse the full menu while you wait.
              </p>
              <Link
                href="/pizzas"
                className="mt-6 inline-flex rounded-full bg-pam-red px-5 py-3 text-sm font-bold text-white"
              >
                Browse menu →
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
