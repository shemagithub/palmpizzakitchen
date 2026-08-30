import type { ProductSizePrices } from "@/data/menu";
import { normalizeSizePrices } from "@/data/menu";

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
  createdAt?: string | null;
};

export type PromoSizeForm = {
  sizesEnabled: boolean;
  priceSmall: string;
  priceMedium: string;
  priceLarge: string;
};

export const EMPTY_PROMO_SIZE_FORM: PromoSizeForm = {
  sizesEnabled: false,
  priceSmall: "",
  priceMedium: "",
  priceLarge: "",
};

export function promoSizeFormFromRecord(
  sizePrices?: ProductSizePrices | null,
): PromoSizeForm {
  const sizes = normalizeSizePrices(sizePrices);
  if (!sizes) return { ...EMPTY_PROMO_SIZE_FORM };
  return {
    sizesEnabled: true,
    priceSmall: sizes.s != null ? String(sizes.s) : "",
    priceMedium: sizes.m != null ? String(sizes.m) : "",
    priceLarge: sizes.l != null ? String(sizes.l) : "",
  };
}

export function buildPromoSizePrices(form: PromoSizeForm): ProductSizePrices | null {
  if (!form.sizesEnabled) return null;
  const money = (raw: string) => {
    const n = Math.round(Number(raw) || 0);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
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
  const built = buildPromoSizePrices(form);
  if (!built) {
    return "Enter at least one promo price (Small, Medium, or Large), or turn sizes off.";
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
};

export const DEAL_TEMPLATES: DealTemplate[] = [
  {
    id: "bogo-burger",
    label: "Buy 1 burger, get 1 free",
    title: "Burger BOGO",
    dealLabel: "Buy 1 · Get 1 Free",
    description:
      "Order any burger and get a second burger free — perfect for sharing or saving one for later.",
    terms:
      "Valid on burgers only. Free item must be same burger or equal/lower price. One BOGO per order.",
    href: "/burgers",
    code: "BOGOBURGER",
    image: "/promo-2.jpg",
  },
  {
    id: "bogo-pizza",
    label: "Buy 1 pizza, get 1 free",
    title: "Pizza BOGO",
    dealLabel: "Buy 1 · Get 1 Free",
    description:
      "Grab your favourite pizza and get another one free on us. Great for family night.",
    terms:
      "Valid on classic & cheese pizzas. Free pizza must be same size or smaller. Dine-in & delivery.",
    href: "/pizzas",
    code: "BOGOPIZZA",
    image: "/promo-1.jpg",
  },
  {
    id: "combo-save",
    label: "Combo meal discount",
    title: "Combo Saver",
    dealLabel: "Save on combos",
    description:
      "Build a combo with pizza, side, and drink — use this code at checkout for extra savings.",
    terms: "Applies to combo meals only. Cannot combine with other offers.",
    href: "/combos",
    code: "COMBO15",
    image: "/promo-3.jpg",
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
  },
  {
    id: "weekday-lunch",
    label: "Weekday lunch special",
    title: "Weekday Lunch Deal",
    dealLabel: "Mon–Fri · Before 3 PM",
    description:
      "Lunch-time savings on selected pizzas and sides. Order before 3 PM on weekdays.",
    terms: "Valid Monday–Friday until 3:00 PM. Selected menu items only.",
    href: "/pizzas",
    code: "LUNCH12",
    image: "/promo-3.jpg",
  },
];

export function offerHref(offer: Pick<OfferRecord, "href">) {
  const href = String(offer.href || "").trim();
  if (!href) return "/pizzas";
  return href.startsWith("/") ? href : `/${href}`;
}
