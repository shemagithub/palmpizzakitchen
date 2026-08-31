import type { MenuItem, ProductSizeId, ProductSizePrices } from "@/data/menu";
import {
  availableSizeOptions,
  defaultSizeId,
  getEnabledSizes,
  normalizeSizePrices,
  PIZZA_CATEGORY_SLUGS,
  sizeLabel,
  sizePrice,
} from "@/data/menu";

export type OfferType = "general" | "bogo" | "fixed_price";

export type OfferRecord = {
  id: string;
  title: string;
  code: string;
  status: string;
  ends: string;
  description?: string;
  dealLabel?: string;
  terms?: string;
  href?: string;
  image?: string;
  showOnHome?: boolean;
  menuItemId?: string;
  sizePrices?: ProductSizePrices | null;
  offerType?: OfferType;
  eligibleCategories?: string[];
  createdAt?: string | null;
};

export type PromoPriceMode = "flat" | "per_size";

export type PromoSizeForm = {
  sizesEnabled: boolean;
  priceMode: PromoPriceMode;
  priceFlat: string;
  priceSmall: string;
  priceMedium: string;
  priceLarge: string;
};

export const EMPTY_PROMO_SIZE_FORM: PromoSizeForm = {
  sizesEnabled: false,
  priceMode: "per_size",
  priceFlat: "",
  priceSmall: "",
  priceMedium: "",
  priceLarge: "",
};

export const OFFER_TYPE_OPTIONS: {
  id: OfferType;
  label: string;
  hint: string;
}[] = [
  {
    id: "general",
    label: "General promo",
    hint: "Shows on site and links to a menu page. No product picker.",
  },
  {
    id: "bogo",
    label: "Buy 1 · Get 1 free",
    hint: "Customer picks the paid item and the free item from your menu.",
  },
  {
    id: "fixed_price",
    label: "Fixed promo price",
    hint: "Customer picks a product and pays your promo size prices at checkout.",
  },
];

export const ELIGIBLE_CATEGORY_OPTIONS: {
  id: MenuItem["category"];
  label: string;
  group?: string;
}[] = [
  { id: "classic", label: "Classic pizzas", group: "Pizzas" },
  { id: "cheese", label: "Cheese pizzas", group: "Pizzas" },
  { id: "veggie", label: "Veggie pizzas", group: "Pizzas" },
  { id: "meat", label: "Meat pizzas", group: "Pizzas" },
  { id: "burger", label: "Burgers", group: "Burgers" },
  { id: "side", label: "Sides", group: "More" },
  { id: "drink", label: "Drinks", group: "More" },
  { id: "combo", label: "Combos", group: "More" },
];

export function promoSizeFormFromRecord(
  sizePrices?: ProductSizePrices | null,
): PromoSizeForm {
  const sizes = normalizeSizePrices(sizePrices);
  if (!sizes) return { ...EMPTY_PROMO_SIZE_FORM };
  if (sizes.flat != null && sizes.s == null && sizes.m == null && sizes.l == null) {
    return {
      sizesEnabled: true,
      priceMode: "flat",
      priceFlat: String(sizes.flat),
      priceSmall: "",
      priceMedium: "",
      priceLarge: "",
    };
  }
  return {
    sizesEnabled: true,
    priceMode: "per_size",
    priceFlat: sizes.flat != null ? String(sizes.flat) : "",
    priceSmall: sizes.s != null ? String(sizes.s) : "",
    priceMedium: sizes.m != null ? String(sizes.m) : "",
    priceLarge: sizes.l != null ? String(sizes.l) : "",
  };
}

export function buildPromoSizePrices(form: PromoSizeForm): ProductSizePrices | null {
  if (!form.sizesEnabled) return null;
  const money = (raw: string) => {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) return null;
    const n = Math.round(Number(trimmed));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  if (form.priceMode === "flat") {
    const flat = money(form.priceFlat);
    if (flat == null) return null;
    return { enabled: true, flat };
  }
  const s = money(form.priceSmall);
  const m = money(form.priceMedium);
  const l = money(form.priceLarge);
  if (s == null && m == null && l == null) return null;
  return {
    enabled: true,
    ...(s != null ? { s } : {}),
    ...(m != null ? { m } : {}),
    ...(l != null ? { l } : {}),
  };
}

export function validatePromoSizeForm(form: PromoSizeForm): string | null {
  if (!form.sizesEnabled) return null;
  if (form.priceMode === "flat") {
    const trimmed = String(form.priceFlat ?? "").trim();
    if (!trimmed || Math.round(Number(trimmed)) <= 0) {
      return "Enter the one promo price for this offer.";
    }
    return null;
  }
  const built = buildPromoSizePrices(form);
  if (!built) {
    return "Enter at least one size price (Small, Medium, or Large), or switch to one price.";
  }
  return null;
}

export function validateOfferForm(input: {
  offerType: OfferType;
  eligibleCategories: string[];
  sizeForm: PromoSizeForm;
}): string | null {
  const sizeError = validatePromoSizeForm(input.sizeForm);
  if (sizeError) return sizeError;
  if (input.offerType === "bogo" && !input.eligibleCategories.length) {
    return "Pick at least one menu category for the BOGO deal.";
  }
  if (input.offerType === "fixed_price") {
    if (!input.eligibleCategories.length) {
      return "Pick at least one menu category for the fixed promo price.";
    }
    if (!input.sizeForm.sizesEnabled) {
      return "Turn on promo size prices for fixed-price offers.";
    }
  }
  return null;
}

export type DealTemplate = {
  id: string;
  label: string;
  title: string;
  dealLabel: string;
  description: string;
  terms: string;
  href: string;
  code: string;
  image: string;
  offerType?: OfferType;
  eligibleCategories?: MenuItem["category"][];
};

export const DEAL_TEMPLATES: DealTemplate[] = [
  {
    id: "bogo-burger",
    label: "Buy 1 burger, get 1 free",
    title: "Burger BOGO",
    dealLabel: "Buy 1 · Get 1 Free",
    description:
      "Order any burger and get a second burger free — pick both burgers from the menu.",
    terms:
      "Valid on burgers only. Free item must be same burger or equal/lower price. One BOGO per order.",
    href: "/burgers",
    code: "BOGOBURGER",
    image: "/promo-2.jpg",
    offerType: "bogo",
    eligibleCategories: ["burger"],
  },
  {
    id: "bogo-pizza",
    label: "Buy 1 pizza, get 1 free",
    title: "Pizza BOGO",
    dealLabel: "Buy 1 · Get 1 Free",
    description:
      "Choose the pizza you pay for and pick another pizza free — names come straight from the menu.",
    terms:
      "Valid on classic, cheese, veggie & meat pizzas. Free pizza must be same size or cheaper.",
    href: "/pizzas",
    code: "BOGOPIZZA",
    image: "/promo-1.jpg",
    offerType: "bogo",
    eligibleCategories: [...PIZZA_CATEGORY_SLUGS],
  },
  {
    id: "combo-save",
    label: "Combo meal discount",
    title: "Combo Saver",
    dealLabel: "Save on combos",
    description:
      "Pick a combo and pay the promo price shown — sizes and prices come from this offer.",
    terms: "Applies to combo meals only. Cannot combine with other offers.",
    href: "/combos",
    code: "COMBO15",
    image: "/promo-3.jpg",
    offerType: "fixed_price",
    eligibleCategories: ["combo"],
  },
  {
    id: "free-delivery",
    label: "Free delivery",
    title: "Free Delivery",
    dealLabel: "Free delivery",
    description:
      "No delivery fee on qualifying orders. Order hot food straight to your door in Kigali.",
    terms: "Minimum order amount may apply. Delivery areas in Kigali only.",
    href: "/pizzas",
    code: "FREEDEL",
    image: "/promo-1.jpg",
    offerType: "general",
  },
  {
    id: "weekday-lunch",
    label: "Weekday lunch special",
    title: "Weekday Lunch Deal",
    dealLabel: "Mon–Fri · Before 3 PM",
    description:
      "Pick your pizza and pay the lunch promo price by size — order before 3 PM on weekdays.",
    terms: "Valid Monday–Friday until 3:00 PM. Selected menu items only.",
    href: "/pizzas",
    code: "LUNCH12",
    image: "/promo-3.jpg",
    offerType: "fixed_price",
    eligibleCategories: [...PIZZA_CATEGORY_SLUGS],
  },
];

export function isOrderableOffer(
  offer: Pick<OfferRecord, "offerType"> | null | undefined,
) {
  const type = offer?.offerType || "general";
  return type === "bogo" || type === "fixed_price";
}

export function offerHref(offer: Pick<OfferRecord, "href" | "id" | "offerType">) {
  if (isOrderableOffer(offer)) {
    return `/offers/order?id=${encodeURIComponent(offer.id)}`;
  }
  const href = String(offer.href || "").trim();
  if (!href) return "/pizzas";
  return href.startsWith("/") ? href : `/${href}`;
}

export function offerOrderPath(
  offer: Pick<OfferRecord, "id" | "code">,
) {
  return `/offers/order?id=${encodeURIComponent(offer.id)}&code=${encodeURIComponent(offer.code)}`;
}

export function filterMenuForOffer(
  items: MenuItem[],
  eligibleCategories?: string[],
) {
  const allowed = new Set(
    (eligibleCategories?.length
      ? eligibleCategories
      : [...PIZZA_CATEGORY_SLUGS, "burger"]
    ).map((c) => String(c)),
  );
  return items.filter((item) => allowed.has(item.category));
}

export function offerPromoSizes(
  offer: Pick<OfferRecord, "sizePrices">,
): ProductSizePrices | null {
  return normalizeSizePrices(offer.sizePrices) || null;
}

/** Only sizes the admin filled in — blank sizes stay hidden on client pages. */
export function offerSizeOptions(offer: Pick<OfferRecord, "sizePrices">) {
  const sizes = offerPromoSizes(offer);
  if (!sizes || sizes.flat != null) return [];
  return availableSizeOptions(sizes);
}

export function offerFlatPrice(
  offer: Pick<OfferRecord, "sizePrices">,
): number | null {
  const sizes = offerPromoSizes(offer);
  if (!sizes || sizes.flat == null) return null;
  return sizes.flat;
}

/** True when offer has a flat price or at least one per-size price. */
export function hasOfferPromoPricing(offer: Pick<OfferRecord, "sizePrices">) {
  const sizes = offerPromoSizes(offer);
  if (!sizes) return false;
  if (sizes.flat != null) return true;
  return availableSizeOptions(sizes).length > 0;
}

export function defaultOfferSize(
  offer: Pick<OfferRecord, "sizePrices">,
): ProductSizeId | undefined {
  const sizes = offerPromoSizes(offer);
  if (!sizes) return undefined;
  return defaultSizeId(sizes);
}

/** Promo checkout price for a size (only when admin set size prices on the offer). */
export function offerPromoUnitPrice(
  offer: Pick<OfferRecord, "sizePrices">,
  size?: ProductSizeId,
): number | null {
  const sizes = offerPromoSizes(offer);
  if (!sizes) return null;
  if (sizes.flat != null && sizes.s == null && sizes.m == null && sizes.l == null) {
    return sizes.flat;
  }
  if (size && sizes[size] != null) return sizes[size]!;
  const fallback = sizes.m ?? sizes.s ?? sizes.l ?? sizes.flat;
  return fallback != null ? fallback : null;
}

export function promoCodesFromNotes(notes?: string): string[] {
  if (!notes) return [];
  for (const part of notes.split("|")) {
    const chunk = part.trim();
    if (chunk.startsWith("promo:")) {
      return chunk
        .slice(6)
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function isPromoOrderLineName(name: string) {
  const n = String(name || "");
  return /\sFREE\s*$/i.test(n) || (n.includes(":") && /\+\s*.+\s*FREE/i.test(n));
}

export function promoLineBadge(name: string, code?: string) {
  if (code) return `Promo · ${code}`;
  if (isPromoOrderLineName(name)) return "Promo offer";
  return "";
}

export function itemPriceAtSize(item: MenuItem, size?: ProductSizeId) {
  const sizes = getEnabledSizes(item);
  if (sizes && size) return sizePrice(sizes, size);
  if (sizes) {
    const values = [sizes.s, sizes.m, sizes.l].filter(
      (v): v is number => typeof v === "number",
    );
    return values.length ? Math.min(...values) : item.price;
  }
  return item.price;
}

export function computeBogoUnitPrice(
  offer: Pick<OfferRecord, "sizePrices">,
  paidItem: MenuItem,
  freeItem: MenuItem,
  size?: ProductSizeId,
) {
  const promoSizes = offerPromoSizes(offer);
  const promoOptions = offerSizeOptions(offer);
  const flatPrice = offerFlatPrice(offer);

  if (promoSizes && promoOptions.length && !flatPrice) {
    if (!size || promoSizes[size] == null) {
      return {
        error: "Choose a size included in this promo offer.",
      };
    }
  }

  const paidMenu = itemPriceAtSize(paidItem, size);
  const freeMenu = itemPriceAtSize(freeItem, size);
  if (freeMenu > paidMenu) {
    return {
      error:
        "Free item must be the same menu price or cheaper than the item you pay for.",
    };
  }

  const promoPrice = offerPromoUnitPrice(offer, size);
  const price = promoPrice != null ? promoPrice : paidMenu;

  return { price, paid: price, free: 0, paidMenu, freeMenu };
}

export function computeFixedOfferPrice(
  offer: Pick<OfferRecord, "sizePrices">,
  item: MenuItem,
  size?: ProductSizeId,
) {
  const promoSizes = offerPromoSizes(offer);
  const promoOptions = offerSizeOptions(offer);
  const flatPrice = offerFlatPrice(offer);

  if (promoSizes && promoOptions.length && !flatPrice) {
    if (!size || promoSizes[size] == null) {
      return null;
    }
    return promoSizes[size]!;
  }

  if (flatPrice != null) {
    return flatPrice;
  }
  return itemPriceAtSize(item, size);
}

export function buildOfferLineName(
  offer: Pick<OfferRecord, "title" | "offerType">,
  paidItem: MenuItem,
  freeItem: MenuItem | null,
  size?: ProductSizeId,
) {
  const sizeSuffix = size ? ` (${sizeLabel(size)})` : "";
  if (offer.offerType === "bogo" && freeItem) {
    return `${offer.title}: ${paidItem.name}${sizeSuffix} + ${freeItem.name}${sizeSuffix} FREE`;
  }
  return `${offer.title}: ${paidItem.name}${sizeSuffix}`;
}

export type OfferBundleMeta = {
  offerId: string;
  offerCode: string;
  offerType: "bogo" | "fixed_price";
  paidItemId: string;
  paidItemName: string;
  freeItemId?: string;
  freeItemName?: string;
  size?: ProductSizeId;
};
