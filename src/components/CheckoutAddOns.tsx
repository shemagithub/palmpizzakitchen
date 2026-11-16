"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ResolvedMenuImage from "@/components/ResolvedMenuImage";
import { useMenu } from "@/components/MenuProvider";
import {
  ALCOHOL_KINDS,
  alcoholKindLabel,
  availableSizeOptions,
  defaultSizeId,
  formatPrice,
  getEnabledSizes,
  itemListPrice,
  normalizeAlcoholKind,
  sizeLabel,
  sizePrice,
  type AlcoholKind,
  type MenuItem,
  type ProductSizeId,
} from "@/data/menu";
import { addToCart } from "@/lib/cart";

type GroupId = "fruit" | "alcohol" | "drink";

const GROUPS: {
  id: GroupId;
  title: string;
  copy: string;
  empty: string;
}[] = [
  {
    id: "fruit",
    title: "Fruit parts",
    copy: "Fresh fruit cups, slices, and plates",
    empty: "No fruit parts on the menu right now.",
  },
  {
    id: "alcohol",
    title: "Wine",
    copy: "Wine, champagne, beer, or other alcohol",
    empty: "No wine or alcohol on the menu right now.",
  },
  {
    id: "drink",
    title: "Drink",
    copy: "Soda, juice, or water",
    empty: "No soft drinks on the menu right now.",
  },
];

type Props = {
  cartItemIds: string[];
  canContinue: boolean;
  onContinue: () => void;
};

export default function CheckoutAddOns({
  cartItemIds,
  canContinue,
  onContinue,
}: Props) {
  const { fruit, alcohol, drinks, loading } = useMenu();
  const [group, setGroup] = useState<GroupId | null>(null);
  const [kind, setKind] = useState<"all" | AlcoholKind>("all");
  const [sizes, setSizes] = useState<Record<string, ProductSizeId>>({});
  const [busyId, setBusyId] = useState("");
  const [addedId, setAddedId] = useState("");
  const [error, setError] = useState("");

  const counts = useMemo(() => {
    const ids = new Set(cartItemIds);
    const count = (list: MenuItem[]) =>
      list.filter((item) => ids.has(item.id)).length;
    return {
      fruit: count(fruit),
      alcohol: count(alcohol),
      drink: count(drinks),
    };
  }, [cartItemIds, fruit, alcohol, drinks]);

  const catalog = group === "fruit" ? fruit : group === "alcohol" ? alcohol : drinks;
  const visible = useMemo(() => {
    if (group !== "alcohol" || kind === "all") return catalog;
    return catalog.filter(
      (item) => (normalizeAlcoholKind(item.details?.alcoholKind) || "other") === kind,
    );
  }, [catalog, group, kind]);

  const addItem = async (item: MenuItem) => {
    setError("");
    setBusyId(item.id);
    try {
      const sizeOptions = getEnabledSizes(item);
      const choices = availableSizeOptions(sizeOptions);
      if (choices.length) {
        const sizeId = sizes[item.id] || defaultSizeId(sizeOptions);
        await addToCart(
          {
            id: item.id,
            name: `${item.name} (${sizeLabel(sizeId)})`,
            price: sizePrice(sizeOptions, sizeId),
            image: item.image,
          },
          1,
          { size: sizeId },
        );
      } else {
        await addToCart(item, 1);
      }
      setAddedId(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that item.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="soft-card rounded-[1.35rem] border border-pam-border/70 bg-white p-4 sm:rounded-[1.75rem] sm:p-6 md:p-7">
      <h2 className="font-[family-name:var(--font-oswald)] text-xl sm:text-2xl">
        Want anything else?
      </h2>
      <p className="mt-1 text-sm text-pam-muted">
        Add fruit parts, wine, or a drink before you pay. You can also skip this
        and continue.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {GROUPS.map((option) => {
          const selected = group === option.id;
          const already = counts[option.id];
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setGroup(selected ? null : option.id);
                setKind("all");
                setError("");
              }}
              className={`min-h-11 min-w-0 rounded-2xl border px-2 py-3 text-left sm:px-3 ${
                selected
                  ? "border-pam-red bg-pam-red/[0.06]"
                  : "border-pam-border bg-pam-sand/40"
              }`}
            >
              <p className="text-sm font-extrabold text-pam-ink">{option.title}</p>
              <p className="mt-1 hidden text-[11px] leading-snug text-pam-muted sm:block">
                {option.copy}
              </p>
              {already > 0 && (
                <p className="mt-2 text-[11px] font-bold text-pam-basil">
                  Already in your order
                </p>
              )}
            </button>
          );
        })}
      </div>

      {group === "alcohol" && (
        <p className="mt-4 rounded-2xl bg-pam-sand px-3 py-2 text-xs text-pam-ink">
          Wine, champagne, and other alcohol are for guests 18 and over. Soft
          drinks are under Drink.
        </p>
      )}

      {group === "alcohol" && (
        <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {([{ id: "all" as const, label: "All" }, ...ALCOHOL_KINDS]).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setKind(filter.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                kind === filter.id
                  ? "bg-pam-red text-white"
                  : "bg-white text-pam-muted ring-1 ring-pam-border"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {group && (
        <div className="mt-4 space-y-2">
          {loading && !visible.length && (
            <p className="text-sm text-pam-muted">Loading the menu…</p>
          )}
          {visible.map((item) => {
            const sizeOptions = availableSizeOptions(getEnabledSizes(item));
            const selectedSize = sizes[item.id] || defaultSizeId(getEnabledSizes(item));
            const price = sizeOptions.length
              ? sizePrice(getEnabledSizes(item), selectedSize)
              : item.price;
            const inOrder = cartItemIds.includes(item.id);
            return (
              <div
                key={item.id}
                className="flex items-center gap-2.5 rounded-2xl border border-pam-border/80 bg-pam-sand/30 p-2 sm:gap-3 sm:p-2.5"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-pam-sand">
                  <ResolvedMenuImage
                    src={item.image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-pam-ink">
                    {item.name}
                  </p>
                  <p className="truncate text-[11px] text-pam-muted">
                    {item.category === "alcohol"
                      ? alcoholKindLabel(item.details?.alcoholKind)
                      : item.description}
                  </p>
                  {sizeOptions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {sizeOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            setSizes((current) => ({
                              ...current,
                              [item.id]: option.id,
                            }))
                          }
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            selectedSize === option.id
                              ? "bg-pam-ink text-white"
                              : "bg-white text-pam-muted ring-1 ring-pam-border"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-sm font-bold text-pam-ink">
                    {formatPrice(price || itemListPrice(item))}
                    {inOrder ? (
                      <span className="ml-2 text-[11px] font-bold text-pam-basil">
                        In your order
                      </span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => void addItem(item)}
                  className={`min-h-11 shrink-0 rounded-full px-3.5 text-xs font-bold text-white disabled:opacity-60 ${
                    addedId === item.id ? "bg-pam-basil" : "bg-pam-red"
                  }`}
                >
                  {busyId === item.id ? "Adding…" : addedId === item.id ? "Added" : "Add"}
                </button>
              </div>
            );
          })}
          {!loading && !visible.length && (
            <p className="rounded-2xl bg-pam-sand px-3 py-3 text-sm text-pam-muted">
              {GROUPS.find((option) => option.id === group)?.empty}{" "}
              <Link
                href={
                  group === "fruit" ? "/fruit" : group === "alcohol" ? "/bar" : "/drinks"
                }
                className="font-bold text-pam-ink underline"
              >
                Open the page
              </Link>
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm font-medium text-pam-red">{error}</p>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className="mt-5 hidden w-full rounded-2xl bg-pam-red py-3.5 text-sm font-bold text-white disabled:opacity-50 md:block"
      >
        {counts.fruit || counts.alcohol || counts.drink
          ? "Continue to details →"
          : "No thanks, continue to details →"}
      </button>
    </div>
  );
}
