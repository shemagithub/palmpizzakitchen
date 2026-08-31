"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ResolvedMenuImage from "@/components/ResolvedMenuImage";
import { PromoSizePriceRowLight } from "@/components/PromoSizePriceRow";
import { useMenu } from "@/components/MenuProvider";
import {
  formatPrice,
  sizeLabel,
  type MenuItem,
  type ProductSizeId,
} from "@/data/menu";
import { addOfferBundleToCart } from "@/lib/cart";
import {
  buildOfferLineName,
  computeBogoUnitPrice,
  computeFixedOfferPrice,
  defaultOfferSize,
  filterMenuForOffer,
  hasOfferPromoPricing,
  offerFlatPrice,
  offerPromoUnitPrice,
  offerSizeOptions,
  type OfferRecord,
} from "@/lib/offers";

type Props = {
  offer: OfferRecord;
};

function ProductPicker({
  label,
  hint,
  options,
  value,
  onChange,
  badge,
}: {
  label: string;
  hint: string;
  options: MenuItem[];
  value: string;
  onChange: (id: string) => void;
  badge?: string;
}) {
  return (
    <div className="rounded-2xl border border-pam-border bg-pam-sand/30 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-pam-ink">{label}</p>
          <p className="mt-1 text-xs text-pam-muted">{hint}</p>
        </div>
        {badge ? (
          <span className="rounded-full bg-pam-gold px-2.5 py-1 text-[10px] font-bold text-pam-ink uppercase">
            {badge}
          </span>
        ) : null}
      </div>
      {!options.length ? (
        <p className="text-sm text-pam-muted">
          No menu items match this offer yet. Ask the kitchen to add products
          under the selected categories.
        </p>
      ) : (
        <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
          {options.map((item) => {
            const selected = value === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                  selected
                    ? "border-pam-red bg-white ring-2 ring-pam-red/20"
                    : "border-pam-border/80 bg-white hover:border-pam-red/40"
                }`}
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-pam-sand">
                  <ResolvedMenuImage
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-pam-ink">
                    {item.name}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function OfferOrderBuilder({ offer }: Props) {
  const { items, loading } = useMenu();
  const eligible = useMemo(
    () => filterMenuForOffer(items, offer.eligibleCategories),
    [items, offer.eligibleCategories],
  );

  const promoSizeOptions = offerSizeOptions(offer);
  const flatPrice = offerFlatPrice(offer);
  const hasPromoSizes = hasOfferPromoPricing(offer);
  const needsSizePick = promoSizeOptions.length > 0;

  const [paidId, setPaidId] = useState("");
  const [freeId, setFreeId] = useState("");
  const [pickedId, setPickedId] = useState("");
  const [size, setSize] = useState<ProductSizeId>(
    () => defaultOfferSize(offer) || "m",
  );
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const next = defaultOfferSize(offer);
    if (next) setSize(next);
  }, [offer.id, offer.sizePrices]);

  const paidItem = eligible.find((i) => i.id === paidId);
  const freeItem = eligible.find((i) => i.id === freeId);
  const pickedItem = eligible.find((i) => i.id === pickedId);

  const resolvedSize = needsSizePick
    ? promoSizeOptions.some((o) => o.id === size)
      ? size
      : defaultOfferSize(offer)
    : undefined;

  const pricing = useMemo(() => {
    if (offer.offerType === "bogo") {
      if (!paidItem || !freeItem) return null;
      return computeBogoUnitPrice(offer, paidItem, freeItem, resolvedSize);
    }
    if (offer.offerType === "fixed_price" && pickedItem) {
      const price = computeFixedOfferPrice(offer, pickedItem, resolvedSize);
      if (price == null) {
        return { error: "Choose a size included in this promo offer." };
      }
      return { price };
    }
    return null;
  }, [offer, paidItem, freeItem, pickedItem, resolvedSize]);

  const canAdd =
    offer.offerType === "bogo"
      ? Boolean(paidItem && freeItem && pricing && !("error" in pricing))
      : Boolean(pickedItem && pricing && !("error" in pricing));

  const handleAdd = () => {
    setError("");
    if (!canAdd || !pricing || "error" in pricing) {
      setError(
        pricing && "error" in pricing
          ? pricing.error || "This combination is not allowed for the deal."
          : "Pick all required items first.",
      );
      return;
    }

    const primary =
      offer.offerType === "bogo" ? paidItem! : pickedItem!;
    const secondary = offer.offerType === "bogo" ? freeItem! : null;

    setBusy(true);
    try {
      addOfferBundleToCart({
        id: primary.id,
        name: buildOfferLineName(
          offer,
          primary,
          secondary,
          resolvedSize,
        ),
        price: pricing.price,
        qty: 1,
        image: primary.image,
        ...(resolvedSize ? { size: resolvedSize } : {}),
        offerBundle: {
          offerId: offer.id,
          offerCode: offer.code,
          offerType: offer.offerType as "bogo" | "fixed_price",
          paidItemId: primary.id,
          paidItemName: primary.name,
          ...(secondary
            ? {
                freeItemId: secondary.id,
                freeItemName: secondary.name,
              }
            : {}),
          ...(resolvedSize ? { size: resolvedSize } : {}),
        },
      });
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1800);
    } catch {
      setError("Could not add to cart. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-pam-border bg-white p-8 text-center text-sm text-pam-muted">
        Loading menu…
      </div>
    );
  }

  const payHint = hasPromoSizes
    ? "You pay the promo price for your size — see prices above."
    : "You pay the menu price for the item you choose.";

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-pam-border bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {offer.dealLabel ? (
              <p className="text-[11px] font-bold tracking-wide text-pam-red uppercase">
                {offer.dealLabel}
              </p>
            ) : null}
            <h1 className="mt-1 font-[family-name:var(--font-oswald)] text-3xl text-pam-ink">
              {offer.title}
            </h1>
            {offer.description ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pam-muted">
                {offer.description}
              </p>
            ) : null}
          </div>
          <p className="rounded-xl bg-pam-sand px-3 py-2 font-mono text-sm font-bold">
            {offer.code}
          </p>
        </div>

        {hasPromoSizes ? (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold tracking-wide text-pam-muted uppercase">
              {flatPrice != null ? "Promo price" : "Promo prices (checkout)"}
            </p>
            <PromoSizePriceRowLight sizes={offer.sizePrices} />
          </div>
        ) : null}

        {offer.terms ? (
          <p className="mt-4 text-xs leading-relaxed text-pam-muted">
            {offer.terms}
          </p>
        ) : null}
      </div>

      {offer.offerType === "bogo" ? (
        <>
          <ProductPicker
            label="1 · Choose what you pay for"
            hint={`Pick a ${offer.eligibleCategories?.includes("burger") ? "burger" : "pizza"} from the menu. ${payHint}`}
            options={eligible}
            value={paidId}
            onChange={setPaidId}
          />
          <ProductPicker
            label="2 · Choose your free item"
            hint="Pick another eligible item — same menu price or cheaper than your paid pick."
            options={eligible}
            value={freeId}
            onChange={setFreeId}
            badge="Free"
          />
        </>
      ) : (
        <ProductPicker
          label="Choose your item"
          hint={`Pick the product you want. ${payHint}`}
          options={eligible}
          value={pickedId}
          onChange={setPickedId}
        />
      )}

      {needsSizePick ? (
        <div className="rounded-2xl border border-pam-border bg-white p-4">
          <p className="text-sm font-bold text-pam-ink">Choose size</p>
          <p className="mt-1 text-xs text-pam-muted">
            Only sizes with a promo price are shown. Blank sizes in admin are
            hidden here.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {promoSizeOptions.map((option) => {
              const promoPrice = offerPromoUnitPrice(offer, option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSize(option.id)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    resolvedSize === option.id
                      ? "bg-pam-red text-white"
                      : "bg-pam-sand text-pam-ink ring-1 ring-pam-border"
                  }`}
                >
                  {option.label}
                  {promoPrice != null ? ` · ${formatPrice(promoPrice)}` : ""}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-pam-border bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-wide text-pam-muted uppercase">
              You pay at checkout
            </p>
            <p className="mt-1 font-[family-name:var(--font-oswald)] text-3xl text-pam-ink">
              {pricing && !("error" in pricing)
                ? formatPrice(pricing.price)
                : "—"}
            </p>
            {offer.offerType === "bogo" && freeItem ? (
              <p className="mt-1 text-sm text-pam-basil">
                + {freeItem.name}
                {resolvedSize ? ` (${sizeLabel(resolvedSize)})` : ""} free
              </p>
            ) : null}
            {flatPrice != null ? (
              <p className="mt-1 text-xs text-pam-muted">
                Flat promo price · code {offer.code}
              </p>
            ) : hasPromoSizes && resolvedSize ? (
              <p className="mt-1 text-xs text-pam-muted">
                Promo price for {sizeLabel(resolvedSize)} · code {offer.code}
              </p>
            ) : null}
            {"error" in (pricing || {}) && pricing && "error" in pricing ? (
              <p className="mt-2 text-sm text-pam-red">{pricing.error}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canAdd || busy}
              onClick={handleAdd}
              className="rounded-full bg-pam-red px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {added ? "Added ✓" : busy ? "Adding…" : "Add deal to cart"}
            </button>
            <Link
              href="/cart"
              className="rounded-full bg-white px-6 py-3 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
            >
              View cart
            </Link>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-pam-red">{error}</p> : null}
      </div>
    </div>
  );
}
