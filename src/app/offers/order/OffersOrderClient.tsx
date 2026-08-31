"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import OfferOrderBuilder from "@/components/OfferOrderBuilder";
import PageHero from "@/components/PageHero";
import { api } from "@/lib/api";
import { isOrderableOffer, offerHref, type OfferRecord } from "@/lib/offers";

export default function OffersOrderClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const code = (searchParams.get("code") || "").trim().toUpperCase();

  const [offer, setOffer] = useState<OfferRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        let data: { offer: OfferRecord };
        if (id) {
          data = await api<{ offer: OfferRecord }>(
            `/offers/public/${encodeURIComponent(id)}`,
          );
        } else if (code) {
          data = await api<{ offer: OfferRecord }>(
            `/offers/code/${encodeURIComponent(code)}`,
          );
        } else {
          throw new Error("Missing offer. Open a deal from the offers page.");
        }
        if (cancelled) return;
        if (!isOrderableOffer(data.offer)) {
          setOffer(data.offer);
          setError("This offer links to the menu — no product picker needed.");
          return;
        }
        setOffer(data.offer);
      } catch (err) {
        if (!cancelled) {
          setOffer(null);
          setError(
            err instanceof Error ? err.message : "Could not load this offer.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, code]);

  return (
    <>
      <PageHero
        title="Build your deal"
        subtitle="Pick the products named on the menu — prices follow the promo rules at checkout."
      />
      <section className="bg-pam-warm py-10 md:py-14">
        <div className="mx-auto max-w-3xl px-5 md:px-8">
          <p className="mb-6 text-sm text-pam-muted">
            <Link href="/offers" className="font-bold text-pam-red hover:underline">
              ← All offers
            </Link>
          </p>

          {loading ? (
            <div className="h-64 animate-pulse rounded-3xl bg-pam-sand" />
          ) : error && !offer ? (
            <div className="rounded-3xl border border-dashed border-pam-border bg-white px-6 py-12 text-center">
              <p className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink">
                Offer not found
              </p>
              <p className="mt-2 text-sm text-pam-muted">{error}</p>
              <Link
                href="/offers"
                className="mt-6 inline-flex rounded-full bg-pam-red px-5 py-3 text-sm font-bold text-white"
              >
                Browse offers
              </Link>
            </div>
          ) : offer && error ? (
            <div className="rounded-3xl border border-pam-border bg-white p-6 text-center">
              <p className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink">
                {offer.title}
              </p>
              <p className="mt-2 text-sm text-pam-muted">{error}</p>
              <Link
                href={offerHref(offer)}
                className="mt-6 inline-flex rounded-full bg-pam-red px-5 py-3 text-sm font-bold text-white"
              >
                Go to menu →
              </Link>
            </div>
          ) : offer ? (
            <OfferOrderBuilder offer={offer} />
          ) : null}
        </div>
      </section>
    </>
  );
}
