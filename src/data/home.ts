import {
  LeafIcon,
  ScooterIcon,
  ShieldIcon,
  SparkIcon,
} from "@/components/icons";
import type { ProductSizePrices } from "@/data/menu";

export type HeroSlide = {
  badge: string;
  title: string;
  accent: string;
  copy: string;
  href: string;
  cta: string;
  image: string;
  /** Short deal highlight e.g. "Buy 1 · Get 1 Free" */
  dealLabel?: string;
  /** Optional promo code shown on the banner */
  promoCode?: string;
  /** Optional promotional S/M/L prices shown on the banner */
  sizePrices?: ProductSizePrices;
};

export const HERO_PROMO_TEMPLATES: Omit<HeroSlide, "image">[] = [
  {
    badge: "BOGO DEAL",
    title: "BUY ONE BURGER.",
    accent: "GET ONE FREE.",
    copy: "Order any burger and grab a second one free — same burger or equal value.",
    href: "/burgers",
    cta: "Order burgers →",
    dealLabel: "Buy 1 · Get 1 Free",
    promoCode: "BOGOBURGER",
  },
  {
    badge: "PIZZA OFFER",
    title: "TWO PIZZAS.",
    accent: "ONE PRICE.",
    copy: "Feed the table with our pizza BOGO — hot, cheesy, and ready fast.",
    href: "/pizzas",
    cta: "See pizzas →",
    dealLabel: "Buy 1 · Get 1 Free",
    promoCode: "BOGOPIZZA",
  },
  {
    badge: "COMBO SAVER",
    title: "COMBO.",
    accent: "MEAL DEAL.",
    copy: "Pizza, side, and drink bundles with extra savings at checkout.",
    href: "/combos",
    cta: "Browse combos →",
    dealLabel: "Save on combos",
    promoCode: "COMBO15",
  },
  {
    badge: "FREE DELIVERY",
    title: "NO DELIVERY FEE.",
    accent: "ORDER NOW.",
    copy: "Hot delivery across Kigali when your order qualifies.",
    href: "/pizzas",
    cta: "Start order →",
    dealLabel: "Free delivery",
    promoCode: "FREEDEL",
  },
];

export const HOME_PROMOS: HeroSlide[] = [
  {
    badge: "LIMITED TIME OFFER",
    title: "MORE CHEESE.",
    accent: "MORE HAPPINESS.",
    copy: "Hot, cheesy and baked with love, just for you.",
    href: "/pizzas",
    cta: "Order Now →",
    image: "/promo-1.jpg",
  },
  {
    badge: "FAMILY DEAL",
    title: "FEED THE.",
    accent: "WHOLE TABLE.",
    copy: "Combo meals built for sharing - hot and ready fast.",
    href: "/combos",
    cta: "See Combos →",
    image: "/promo-2.jpg",
  },
  {
    badge: "CRISPY SIDES",
    title: "DIP. CRUNCH.",
    accent: "REPEAT.",
    copy: "Garlic bread, wings, and more to round out your order.",
    href: "/sides",
    cta: "Browse Sides →",
    image: "/promo-3.jpg",
  },
];

export const QUICK_CATEGORIES = [
  {
    label: "All",
    href: "/pizzas",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&q=70",
  },
  {
    label: "Pizzas",
    href: "/pizzas",
    image:
      "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=200&q=70",
  },
  {
    label: "Garlic Bread",
    href: "/sides",
    image:
      "https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&w=200&q=70",
  },
  {
    label: "Burgers",
    href: "/burgers",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=70",
  },
  {
    label: "Sides",
    href: "/sides",
    image:
      "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=200&q=70",
  },
  {
    label: "Drinks",
    href: "/drinks",
    image:
      "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=200&q=70",
  },
  {
    label: "Desserts",
    href: "/sides",
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=200&q=70",
  },
] as const;

export const TRUST_POINTS = [
  { label: "Fast Delivery", sub: "30-40 mins", Icon: ScooterIcon },
  { label: "Best Quality", sub: "Always Fresh", Icon: LeafIcon },
  { label: "Exciting Offers", sub: "Everyday", Icon: SparkIcon },
  { label: "Safe & Secure", sub: "Payments", Icon: ShieldIcon },
] as const;
