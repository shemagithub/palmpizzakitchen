import { HOME_PROMOS, type HeroSlide } from "@/data/home";
import { normalizeSizePrices } from "@/data/menu";
import {
  DEFAULT_COMBO_BANNER,
  DEFAULT_ORDER_CTA,
  DEFAULT_QUICK_CATEGORIES,
  DEFAULT_TESTIMONIALS,
  DEFAULT_TRUST_POINTS,
} from "@/lib/homeContent";

export type { HeroSlide };

export type SiteSettings = {
  company_name: string;
  company_tagline: string;
  logo_url: string;
  footer_blurb: string;
  about_text: string;
  phone: string;
  email: string;
  address: string;
  open_hours: string;
  social_instagram: string;
  social_facebook: string;
  social_tiktok: string;
  social_twitter: string;
  social_whatsapp: string;
  promo_badge: string;
  accepting_orders: string;
  delivery_fee: string;
  /** JSON array: [{ area, fee }] per Kigali sector */
  delivery_area_fees: string;
  min_order: string;
  kitchen_note: string;
  /** JSON string of HeroSlide[] for homepage carousel */
  hero_slides: string;
  testimonials: string;
  combo_banner: string;
  trust_points: string;
  quick_categories: string;
  order_cta: string;
  about_subtitle: string;
  about_story_title: string;
  about_story_image: string;
};

export const DEFAULT_HERO_SLIDES: HeroSlide[] = HOME_PROMOS.map((s) => ({
  ...s,
}));

export function emptyHeroSlide(): HeroSlide {
  return {
    badge: "NEW OFFER",
    title: "YOUR HEADLINE.",
    accent: "GOES HERE.",
    copy: "Short supporting line for this hero slide.",
    href: "/pizzas",
    cta: "Order Now →",
    image: "/promo-1.jpg",
  };
}

export function parseHeroSlides(raw: string | undefined | null): HeroSlide[] {
  if (!raw?.trim()) return DEFAULT_HERO_SLIDES.map((s) => ({ ...s }));
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_HERO_SLIDES.map((s) => ({ ...s }));
    }
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const title = String(row.title ?? "").trim();
        const image = String(row.image ?? "").trim();
        if (!title || !image) return null;
        const slide: HeroSlide = {
          badge: String(row.badge ?? "OFFER").trim() || "OFFER",
          title,
          accent: String(row.accent ?? "").trim(),
          copy: String(row.copy ?? "").trim(),
          href: String(row.href ?? "/pizzas").trim() || "/pizzas",
          cta: String(row.cta ?? "Order Now →").trim() || "Order Now →",
          image: image.replace(
            /\/promo-(1|2|3)\.png$/i,
            "/promo-$1.jpg",
          ),
        };
        const dealLabel = String(row.dealLabel ?? row.deal_label ?? "").trim();
        const promoCode = String(row.promoCode ?? row.promo_code ?? "").trim();
        if (dealLabel) slide.dealLabel = dealLabel;
        if (promoCode) slide.promoCode = promoCode;
        const sizePrices = normalizeSizePrices(row.sizePrices ?? row.size_prices);
        if (sizePrices) slide.sizePrices = sizePrices;
        return slide;
      })
      .filter((s): s is HeroSlide => Boolean(s));
  } catch {
    return DEFAULT_HERO_SLIDES.map((s) => ({ ...s }));
  }
}

export function serializeHeroSlides(slides: HeroSlide[]): string {
  return JSON.stringify(slides);
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  company_name: "Palm Pizza Kitchen",
  company_tagline: "Hot. Fresh. Delicious.",
  logo_url: "/logo.png",
  footer_blurb:
    "A neighborhood kitchen for hot pies, easy orders, and nights that smell like melted cheese. Come hungry - leave happy.",
  about_text:
    "From dough to delivery, we keep things straightforward - stone ovens, fresh toppings, and packaging that keeps every slice warm. Whether you want a classic margherita or a loaded meat pizza, we cook it carefully and bring it fast.",
  phone: "+250 788 000 199",
  email: "info@palmpizzakitchen.com",
  address: "KN 12 Ave, Kigali, Rwanda",
  open_hours: "11:00 AM – 11:00 PM",
  social_instagram: "https://instagram.com/",
  social_facebook: "",
  social_tiktok: "https://tiktok.com/",
  social_twitter: "https://x.com/",
  social_whatsapp: "https://wa.me/250788000199",
  promo_badge: "Free delivery 25,000 RWF+",
  accepting_orders: "1",
  delivery_fee: "1500",
  delivery_area_fees: "",
  min_order: "8000",
  kitchen_note: "",
  hero_slides: serializeHeroSlides(DEFAULT_HERO_SLIDES),
  testimonials: JSON.stringify(DEFAULT_TESTIMONIALS),
  combo_banner: JSON.stringify(DEFAULT_COMBO_BANNER),
  trust_points: JSON.stringify(DEFAULT_TRUST_POINTS),
  quick_categories: JSON.stringify(DEFAULT_QUICK_CATEGORIES),
  order_cta: JSON.stringify(DEFAULT_ORDER_CTA),
  about_subtitle:
    "Built around one idea: pizza should arrive hot, fresh, and easy to order.",
  about_story_title: "Our kitchen story",
  about_story_image:
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=70",
};

export const WEBSITE_SETTING_KEYS = [
  "company_name",
  "company_tagline",
  "logo_url",
  "footer_blurb",
  "about_text",
  "phone",
  "email",
  "address",
  "open_hours",
  "social_instagram",
  "social_facebook",
  "social_tiktok",
  "social_twitter",
  "social_whatsapp",
  "promo_badge",
  "accepting_orders",
  "delivery_fee",
  "delivery_area_fees",
  "min_order",
  "kitchen_note",
  "hero_slides",
  "testimonials",
  "combo_banner",
  "trust_points",
  "quick_categories",
  "order_cta",
  "about_subtitle",
  "about_story_title",
  "about_story_image",
] as const;

export function mergeSiteSettings(
  raw: Record<string, string> | undefined | null,
): SiteSettings {
  const next = { ...DEFAULT_SITE_SETTINGS };
  if (!raw) return next;
  for (const key of WEBSITE_SETTING_KEYS) {
    const value = raw[key];
    if (value !== undefined && value !== null && String(value).length > 0) {
      next[key] = String(value);
    } else if (value === "") {
      // Allow clearing optional social links / kitchen note
      if (key.startsWith("social_") || key === "kitchen_note") {
        next[key] = "";
      }
    }
  }
  return next;
}
