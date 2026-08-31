"use client";

import MoneyInput from "@/components/admin/MoneyInput";
import type { PromoPriceMode, PromoSizeForm } from "@/lib/offers";

type Props = {
  form: PromoSizeForm;
  onChange: (next: PromoSizeForm) => void;
  onCopyFromMenu?: () => void;
  copyLabel?: string;
  /** When true, suggest one flat price (burgers). */
  burgerStyle?: boolean;
};

export default function PromoSizeFields({
  form,
  onChange,
  onCopyFromMenu,
  copyLabel = "Copy prices from menu item",
  burgerStyle = false,
}: Props) {
  const patch = (partial: Partial<PromoSizeForm>) =>
    onChange({ ...form, ...partial });

  const setMode = (priceMode: PromoPriceMode) => {
    onChange({ ...form, priceMode });
  };

  return (
    <div className="rounded-2xl border border-pam-red/25 bg-gradient-to-br from-pam-red/[0.06] to-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-[0.14em] text-pam-red uppercase">
            Promo price
          </p>
          <p className="mt-1 text-sm font-extrabold text-pam-ink">
            Set a checkout price for this offer?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-pam-muted">
            {burgerStyle
              ? "Burgers often use one price for all. Pizzas can use a different price per size."
              : "Choose one price for all items, or set Small / Medium / Large separately."}
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
            {form.sizesEnabled ? "Promo price on" : "Promo price off"}
          </span>
        </button>
      </div>

      {form.sizesEnabled ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("flat")}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                form.priceMode === "flat"
                  ? "bg-pam-red text-white"
                  : "bg-white text-pam-ink ring-1 ring-pam-border"
              }`}
            >
              One price (all items)
            </button>
            <button
              type="button"
              onClick={() => setMode("per_size")}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                form.priceMode === "per_size"
                  ? "bg-pam-red text-white"
                  : "bg-white text-pam-ink ring-1 ring-pam-border"
              }`}
            >
              Different price per size
            </button>
          </div>

          {onCopyFromMenu ? (
            <button
              type="button"
              onClick={onCopyFromMenu}
              className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-pam-ink ring-1 ring-pam-border"
            >
              {copyLabel}
            </button>
          ) : null}

          {form.priceMode === "flat" ? (
            <div className="rounded-xl border border-pam-border/80 bg-white p-4">
              <label className="mb-2 block text-xs font-bold text-pam-ink">
                Promo price (one amount)
              </label>
              <MoneyInput
                value={form.priceFlat}
                onChange={(fee) => patch({ priceFlat: fee ? String(fee) : "" })}
                placeholder={burgerStyle ? "5500" : "10000"}
                aria-label="One promo price for all"
              />
              <p className="mt-2 text-[11px] text-pam-muted">
                Customer pays this amount — no size choice. Good for burgers and
                single-price deals.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["priceSmall", "Small", "8000"],
                  ["priceMedium", "Medium", "12000"],
                  ["priceLarge", "Large", "15000"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <div
                  key={key}
                  className="rounded-xl border border-pam-border/80 bg-white p-3"
                >
                  <label className="mb-2 block text-xs font-bold text-pam-ink">
                    {label}
                  </label>
                  <MoneyInput
                    value={form[key]}
                    onChange={(fee) =>
                      patch({ [key]: fee ? String(fee) : "" })
                    }
                    placeholder={placeholder}
                    aria-label={`${label} promo price`}
                  />
                  <p className="mt-1.5 text-[10px] text-pam-muted">
                    Leave empty to hide {label.toLowerCase()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
