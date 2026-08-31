import { formatPrice } from "@/data/menu";
import {
  availableSizeOptions,
  sizePrice,
  type ProductSizePrices,
} from "@/data/menu";

function flatOnly(sizes: ProductSizePrices | null | undefined) {
  if (!sizes?.enabled || sizes.flat == null) return null;
  if (availableSizeOptions(sizes).length) return null;
  return sizes.flat;
}

type Props = {
  sizes: ProductSizePrices | null | undefined;
  /** compact = inline chips; stacked = one per line */
  layout?: "compact" | "stacked";
  className?: string;
};

export default function PromoSizePriceRow({
  sizes,
  layout = "compact",
  className = "",
}: Props) {
  const flat = flatOnly(sizes);
  if (flat != null) {
    return (
      <span
        className={
          layout === "stacked"
            ? "inline-flex rounded-xl bg-pam-sand px-3 py-2 text-sm font-bold text-pam-ink"
            : `rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm ring-1 ring-white/20 ${className}`
        }
      >
        {formatPrice(flat)}
      </span>
    );
  }

  const options = availableSizeOptions(sizes);
  if (!options.length) return null;

  return (
    <div
      className={`flex flex-wrap gap-2 ${layout === "stacked" ? "flex-col" : ""} ${className}`}
    >
      {options.map((option) => (
        <span
          key={option.id}
          className={
            layout === "stacked"
              ? "flex items-center justify-between rounded-xl bg-pam-sand px-3 py-2 text-sm"
              : "rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm ring-1 ring-white/20"
          }
        >
          <span className={layout === "stacked" ? "text-pam-muted" : ""}>
            {option.label}
          </span>
          <span
            className={
              layout === "stacked"
                ? "font-bold text-pam-ink"
                : "ml-1.5 text-pam-gold"
            }
          >
            {formatPrice(sizePrice(sizes, option.id))}
          </span>
        </span>
      ))}
    </div>
  );
}

export function PromoSizePriceRowLight({
  sizes,
  className = "",
}: Omit<Props, "layout">) {
  const flat = flatOnly(sizes);
  if (flat != null) {
    return (
      <span
        className={`inline-flex rounded-xl bg-pam-sand px-2.5 py-1.5 text-xs font-bold text-pam-ink ${className}`}
      >
        <span className="text-pam-red">{formatPrice(flat)}</span>
      </span>
    );
  }

  const options = availableSizeOptions(sizes);
  if (!options.length) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => (
        <span
          key={option.id}
          className="rounded-xl bg-pam-sand px-2.5 py-1.5 text-xs font-bold text-pam-ink"
        >
          {option.label}{" "}
          <span className="text-pam-red">
            {formatPrice(sizePrice(sizes, option.id))}
          </span>
        </span>
      ))}
    </div>
  );
}
