"use client";

import type { PromoSizeForm } from "@/lib/offers";

type Props = {
  form: PromoSizeForm;
  onChange: (next: PromoSizeForm) => void;
  /** Pull suggested prices from a menu item */
  onCopyFromMenu?: () => void;
  copyLabel?: string;
};

export default function PromoSizeFields({
  form,
  onChange,
  onCopyFromMenu,
  copyLabel = "Copy prices from menu item",
}: Props) {
  const patch = (partial: Partial<PromoSizeForm>) =>
    onChange({ ...form, ...partial });

  return (
    <div className="rounded-2xl border-2 border-pam-red/30 bg-pam-red/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-pam-red uppercase">
            Promo size prices
          </p>
          <p className="mt-1 text-sm font-extrabold text-pam-ink">
            Show Small / Medium / Large prices?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-pam-muted">
            Turn on to display promo prices by size on the banner, homepage
            deals, and offers page.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.sizesEnabled}
          onClick={() =>
            patch({
              sizesEnabled: !form.sizesEnabled,
            })
          }
          className={`relative h-9 w-16 shrink-0 rounded-full transition ${
            form.sizesEnabled ? "bg-pam-red" : "bg-pam-border"
          }`}
        >
          <span
            className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition ${
              form.sizesEnabled ? "left-8" : "left-1"
            }`}
          />
          <span className="sr-only">
            {form.sizesEnabled ? "Size prices on" : "Size prices off"}
          </span>
        </button>
      </div>

      {form.sizesEnabled ? (
        <div className="mt-4 space-y-3">
          {onCopyFromMenu ? (
            <button
              type="button"
              onClick={onCopyFromMenu}
              className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-pam-ink ring-1 ring-pam-border"
            >
              {copyLabel}
            </button>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ["priceSmall", "Small"],
                ["priceMedium", "Medium"],
                ["priceLarge", "Large"],
              ] as const
            ).map(([key, label]) => (
              <div
                key={key}
                className="rounded-xl bg-white p-3 ring-1 ring-pam-border/80"
              >
                <label className="mb-1.5 block text-xs font-bold text-pam-ink">
                  {label} (RWF)
                </label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  className="input-field rounded-xl"
                  value={form[key]}
                  onChange={(e) => patch({ [key]: e.target.value })}
                  placeholder={label === "Medium" ? "12000" : "15000"}
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-pam-muted">
            Enter at least one size. Leave a box empty to hide that size on the
            promo.
          </p>
        </div>
      ) : null}
    </div>
  );
}
