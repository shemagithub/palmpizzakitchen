"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  availableSizeOptions,
  categoryLabel,
  comboLineDisplayName,
  defaultSizeId,
  formatPrice,
  getComboSlots,
  getEnabledSizes,
  optionsForComboSlot,
  sizeLabel,
  sizePrice,
  type ComboChoice,
  type MenuItem,
  type ProductDetails,
  type ProductSizeId,
} from "@/data/menu";
import { addToCart } from "@/lib/cart";
import { useMenu } from "@/components/MenuProvider";
import ResolvedMenuImage from "@/components/ResolvedMenuImage";

type Props = {
  item: MenuItem;
  details: ProductDetails;
};

export default function ProductDetailPanel({ item, details }: Props) {
  const { items: catalog } = useMenu();
  const mergedDetails = { ...details, ...item.details };
  const sizes =
    getEnabledSizes(item) || getEnabledSizes({ details: mergedDetails }) || null;
  const sizeChoices = availableSizeOptions(sizes);
  const comboSlots = getComboSlots({
    category: item.category,
    details: mergedDetails,
  });
  const needsCombo = comboSlots.length > 0;

  const [size, setSize] = useState<ProductSizeId>(() => defaultSizeId(sizes));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pickError, setPickError] = useState("");
  const [picks, setPicks] = useState<Record<string, string>>({});

  useEffect(() => {
    setSize(defaultSizeId(sizes));
  }, [item.id, sizes?.s, sizes?.m, sizes?.l, sizes?.enabled]);

  useEffect(() => {
    setPicks({});
    setPickError("");
  }, [item.id]);

  const unitPrice = useMemo(() => {
    if (!sizes || !sizeChoices.length) return item.price;
    return sizePrice(sizes, size);
  }, [item.price, size, sizes, sizeChoices.length]);

  const total = unitPrice * qty;
  const selectedLabel = sizeLabel(size);

  const comboChoices: ComboChoice[] | undefined = useMemo(() => {
    if (!needsCombo) return undefined;
    const list: ComboChoice[] = [];
    for (const slot of comboSlots) {
      const itemId = picks[slot.id];
      if (!itemId) continue;
      const found =
        catalog.find((m) => m.id === itemId) ||
        optionsForComboSlot(slot, catalog).find((m) => m.id === itemId);
      list.push({
        slotId: slot.id,
        itemId,
        itemName: found?.name || itemId,
      });
    }
    return list.length === comboSlots.length ? list : undefined;
  }, [needsCombo, comboSlots, picks, catalog]);

  const handleAdd = async () => {
    if (needsCombo) {
      const missing = comboSlots.find((s) => !picks[s.id]);
      if (missing) {
        setPickError(`Please select: ${missing.label}`);
        return;
      }
      if (!comboChoices) {
        setPickError("Please finish your combo choices.");
        return;
      }
    }
    setPickError("");
    setBusy(true);
    try {
      const displayName = needsCombo
        ? comboLineDisplayName(item.name, comboChoices)
        : sizes && sizeChoices.length
          ? `${item.name} (${selectedLabel})`
          : item.name;
      await addToCart(
        {
          id: item.id,
          name: displayName,
          price: unitPrice,
          image: item.image,
        },
        qty,
        {
          ...(sizes && sizeChoices.length ? { size } : {}),
          ...(comboChoices ? { comboChoices } : {}),
        },
      );
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1600);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  const addLabel = added
    ? "Added ✓"
    : busy
      ? "Adding…"
      : needsCombo
        ? "Add combo to cart"
        : "Add to cart";

  return (
    <div className="min-w-0 pb-24 md:pb-0">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-pam-red uppercase sm:text-sm">
        {categoryLabel(item.category)}
        {item.badge ? ` · ${item.badge}` : ""}
      </p>

      <h1 className="mt-2 font-[family-name:var(--font-oswald)] text-[1.85rem] leading-tight tracking-[0.03em] text-pam-ink sm:mt-3 sm:text-4xl md:text-5xl xl:text-[3.25rem]">
        {item.name}
      </h1>

      <p className="mt-2 text-sm text-pam-muted sm:mt-3">
        {item.rating.toFixed(1)} rating · {item.reviews} reviews
      </p>

      <p className="mt-4 text-sm leading-relaxed text-pam-ink/75 sm:mt-5 sm:text-base md:text-lg">
        {details.longDescription}
      </p>

      <dl className="mt-6 grid grid-cols-3 gap-2 border-y border-pam-border py-4 text-xs sm:mt-8 sm:gap-4 sm:py-5 sm:text-sm">
        <div className="min-w-0">
          <dt className="text-pam-muted">Ready in</dt>
          <dd className="mt-1 font-semibold break-words text-pam-ink">
            {details.prepTime}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-pam-muted">Serves</dt>
          <dd className="mt-1 font-semibold break-words text-pam-ink">
            {details.serves}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-pam-muted">Energy</dt>
          <dd className="mt-1 font-semibold break-words text-pam-ink">
            {details.calories}
          </dd>
        </div>
      </dl>

      {needsCombo && (
        <div className="mt-6 space-y-5 sm:mt-8">
          <div>
            <p className="text-sm font-semibold text-pam-ink">
              Build your combo
            </p>
            <p className="mt-1 text-xs text-pam-muted">
              Pick each included item clearly — pizza type, drink, and more.
            </p>
          </div>
          {comboSlots.map((slot, index) => {
            const options = optionsForComboSlot(slot, catalog);
            const selectedId = picks[slot.id] || "";
            return (
              <div
                key={slot.id}
                className="rounded-2xl border border-pam-border bg-pam-sand/40 p-3 sm:p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-pam-ink">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-pam-red text-[11px] text-white">
                      {index + 1}
                    </span>
                    {slot.label}
                  </p>
                  {selectedId ? (
                    <span className="text-[11px] font-bold text-pam-basil">
                      Selected
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-pam-muted">
                      Required
                    </span>
                  )}
                </div>
                {!options.length ? (
                  <p className="text-xs text-pam-muted">
                    No products available for this choice yet. Ask the kitchen
                    to add menu items.
                  </p>
                ) : (
                  <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
                    {options.map((opt) => {
                      const selected = selectedId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setPicks((prev) => ({ ...prev, [slot.id]: opt.id }));
                            setPickError("");
                          }}
                          aria-pressed={selected}
                          className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ring-2 ${
                            selected
                              ? "bg-white ring-pam-red shadow-sm"
                              : "bg-white/70 ring-transparent hover:bg-white"
                          }`}
                        >
                          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-pam-sand">
                            <ResolvedMenuImage
                              src={opt.image}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="44px"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-pam-ink">
                              {opt.name}
                            </span>
                            <span className="block truncate text-[11px] text-pam-muted">
                              {categoryLabel(opt.category)}
                            </span>
                          </span>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                              selected
                                ? "bg-pam-red text-white"
                                : "bg-pam-border text-pam-muted"
                            }`}
                          >
                            {selected ? "✓" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {pickError ? (
            <p className="rounded-xl bg-pam-red/10 px-3 py-2 text-sm font-semibold text-pam-red">
              {pickError}
            </p>
          ) : null}
        </div>
      )}

      {sizeChoices.length > 0 && sizes && (
        <div className="mt-6 sm:mt-8">
          <div className="mb-3 flex items-end justify-between gap-3">
            <p className="text-sm font-semibold text-pam-ink">Choose a size</p>
            <p className="text-xs font-bold text-pam-red">
              Selected: {selectedLabel}
            </p>
          </div>
          <div
            className={`grid gap-2 ${
              sizeChoices.length === 1
                ? "grid-cols-1"
                : sizeChoices.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-3"
            }`}
          >
            {sizeChoices.map((option) => {
              const selected = size === option.id;
              const price = sizePrice(sizes, option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSize(option.id)}
                  aria-pressed={selected}
                  className={`rounded-2xl px-2 py-3.5 text-center transition ring-2 ${
                    selected
                      ? "bg-pam-red text-white ring-pam-red shadow-[0_8px_20px_rgba(227,24,55,0.28)]"
                      : "bg-pam-sand text-pam-ink ring-transparent hover:bg-pam-border/70"
                  }`}
                >
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span
                    className={`mt-1.5 block font-[family-name:var(--font-oswald)] text-base ${
                      selected ? "text-white" : "text-pam-ink"
                    }`}
                  >
                    {formatPrice(price)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-pam-red/20 bg-pam-red/5 px-4 py-3">
            <p className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
              Price for {selectedLabel}
            </p>
            <p className="mt-0.5 font-[family-name:var(--font-oswald)] text-2xl text-pam-ink sm:text-3xl">
              {formatPrice(unitPrice)}
              {qty > 1 ? (
                <span className="ml-2 text-sm font-semibold text-pam-muted">
                  × {qty} = {formatPrice(total)}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 sm:mt-8">
        <p className="mb-3 text-sm font-semibold text-pam-ink">Quantity</p>
        <div className="inline-flex items-center overflow-hidden rounded-xl border border-pam-border bg-pam-surface sm:rounded-none">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-11 w-11 items-center justify-center text-lg text-pam-ink hover:bg-pam-sand"
          >
            −
          </button>
          <span className="min-w-12 text-center font-[family-name:var(--font-oswald)] text-xl text-pam-ink">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => Math.min(12, q + 1))}
            className="flex h-11 w-11 items-center justify-center text-lg text-pam-ink hover:bg-pam-sand"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-6 hidden flex-wrap items-center gap-3 sm:mt-8 md:flex">
        <div>
          {sizeChoices.length > 0 ? (
            <p className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
              {selectedLabel} · Total
            </p>
          ) : null}
          <p className="font-[family-name:var(--font-oswald)] text-3xl text-pam-ink lg:text-4xl">
            {formatPrice(total)}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleAdd()}
          className={`rounded-sm px-6 py-3.5 text-sm font-bold text-white transition disabled:opacity-70 ${
            added ? "bg-pam-basil" : "bg-pam-red hover:bg-pam-red-deep"
          }`}
        >
          {addLabel}
        </button>
        <Link
          href="/cart"
          className="rounded-sm bg-pam-sand px-5 py-3.5 text-sm font-bold text-pam-ink"
        >
          View cart
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:mt-10 sm:gap-x-8 sm:gap-y-8">
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-oswald)] text-lg tracking-[0.04em] text-pam-ink sm:text-xl">
            Ingredients
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-pam-muted">
            {details.ingredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-oswald)] text-lg tracking-[0.04em] text-pam-ink sm:text-xl">
            Allergens
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-pam-muted">
            {details.allergens.map((allergen) => (
              <li key={allergen}>{allergen}</li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-oswald)] text-lg tracking-[0.04em] text-pam-ink sm:text-xl">
            Highlights
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-pam-muted">
            {details.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.85rem+env(safe-area-inset-bottom))] z-40 border-t border-pam-border/80 bg-white/95 px-3 py-2.5 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-pam-muted uppercase">
              {sizeChoices.length > 0
                ? `${selectedLabel} · Total`
                : "Total"}
            </p>
            <p className="truncate font-[family-name:var(--font-oswald)] text-lg text-pam-ink">
              {formatPrice(total)}
            </p>
          </div>
          <Link
            href="/cart"
            className="shrink-0 rounded-xl bg-pam-sand px-3 py-3 text-xs font-bold text-pam-ink"
          >
            Cart
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleAdd()}
            className={`shrink-0 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-70 ${
              added ? "bg-pam-basil" : "bg-pam-red"
            }`}
          >
            {addLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
