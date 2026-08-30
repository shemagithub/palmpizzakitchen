/** Landing-page content stored as JSON in settings */

export type TestimonialItem = {
  name: string;
  area: string;
  rating: number;
  quote: string;
};

export type ComboBannerContent = {
  eyebrow: string;
  title: string;
  copy: string;
  cta: string;
  href: string;
  badge: string;
  image: string;
};

export type TrustPointItem = {
  label: string;
  sub: string;
};

export type QuickCategoryItem = {
  id: string;
  label: string;
  href: string;
  image: string;
};

export function newQuickCategoryId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `cat-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export type OrderCtaContent = {
  title: string;
  copy: string;
  primary_label: string;
  primary_href: string;
  secondary_label: string;
  secondary_href: string;
  image: string;
};

export const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  {
    name: "Maya R.",
    area: "Remera",
    rating: 5,
    quote:
      "Showed up hot and exactly how I ordered it. Easy weeknight dinner.",
  },
  {
    name: "Jordan T.",
    area: "Kimironko",
    rating: 5,
    quote:
      "The Family Feast is simple and filling. We keep coming back on weekends.",
  },
  {
    name: "Sam K.",
    area: "Kacyiru",
    rating: 5,
    quote:
      "Clear menu, quick order, great pepperoni. Feels like a neighborhood kitchen.",
  },
];

export const DEFAULT_COMBO_BANNER: ComboBannerContent = {
  eyebrow: "Combos",
  title: "Family & party packs",
  copy: "Pizza plus sides or drinks — easier than ordering piece by piece.",
  cta: "See combos",
  href: "/combos",
  badge: "Save",
  image:
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=70",
};

export const DEFAULT_TRUST_POINTS: TrustPointItem[] = [
  { label: "Delivery in Kigali", sub: "Usually 30–40 min" },
  { label: "Made to order", sub: "Fresh from the oven" },
  { label: "Combos & offers", sub: "On the menu weekly" },
  { label: "Card & mobile pay", sub: "At checkout" },
];

export const DEFAULT_QUICK_CATEGORIES: QuickCategoryItem[] = [
  {
    id: "all",
    label: "All",
    href: "/pizzas",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&q=70",
  },
  {
    id: "pizzas",
    label: "Pizzas",
    href: "/pizzas",
    image:
      "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=200&q=70",
  },
  {
    id: "garlic-bread",
    label: "Garlic Bread",
    href: "/sides",
    image:
      "https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&w=200&q=70",
  },
  {
    id: "burgers",
    label: "Burgers",
    href: "/burgers",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=70",
  },
  {
    id: "sides",
    label: "Sides",
    href: "/sides",
    image:
      "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=200&q=70",
  },
  {
    id: "drinks",
    label: "Drinks",
    href: "/drinks",
    image:
      "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=200&q=70",
  },
  {
    id: "desserts",
    label: "Desserts",
    href: "/sides",
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=200&q=70",
  },
];

export const DEFAULT_ORDER_CTA: OrderCtaContent = {
  title: "Ready when you are",
  copy: "Browse the menu, add what you want, and we'll handle the rest.",
  primary_label: "Start ordering",
  primary_href: "/pizzas",
  secondary_label: "See combos",
  secondary_href: "/combos",
  image:
    "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1200&q=70",
};

function asObj(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
}

export function newTestimonial(): TestimonialItem {
  return {
    name: "",
    area: "Kigali",
    rating: 5,
    quote: "",
  };
}

export function serializeTestimonials(items: TestimonialItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      name: item.name.trim(),
      area: item.area.trim() || "Kigali",
      rating: Math.min(5, Math.max(1, Number(item.rating) || 5)),
      quote: item.quote.trim(),
    })),
  );
}

export type TestimonialValidation = {
  index: number;
  issues: string[];
};

export function validateTestimonials(
  items: TestimonialItem[],
): TestimonialValidation[] {
  return items
    .map((item, index) => {
      const issues: string[] = [];
      if (!item.name.trim()) issues.push("Customer name is required");
      if (!item.quote.trim()) issues.push("Review text is required");
      return { index, issues };
    })
    .filter((row) => row.issues.length > 0);
}

export function parseTestimonials(raw?: string | null): TestimonialItem[] {
  if (!raw?.trim()) return DEFAULT_TESTIMONIALS.map((t) => ({ ...t }));
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return DEFAULT_TESTIMONIALS.map((t) => ({ ...t }));
    }
    if (parsed.length === 0) return [];
    return parsed
      .map((item) => {
        const row = asObj(item);
        if (!row) return null;
        const name = String(row.name ?? "").trim();
        const quote = String(row.quote ?? "").trim();
        if (!name || !quote) return null;
        return {
          name,
          area: String(row.area ?? "").trim() || "Kigali",
          rating: Math.min(5, Math.max(1, Number(row.rating) || 5)),
          quote,
        };
      })
      .filter((t): t is TestimonialItem => Boolean(t));
  } catch {
    return DEFAULT_TESTIMONIALS.map((t) => ({ ...t }));
  }
}

export function parseComboBanner(raw?: string | null): ComboBannerContent {
  if (!raw?.trim()) return { ...DEFAULT_COMBO_BANNER };
  try {
    const row = asObj(JSON.parse(raw));
    if (!row) return { ...DEFAULT_COMBO_BANNER };
    return {
      eyebrow: String(row.eyebrow ?? DEFAULT_COMBO_BANNER.eyebrow),
      title: String(row.title ?? DEFAULT_COMBO_BANNER.title),
      copy: String(row.copy ?? DEFAULT_COMBO_BANNER.copy),
      cta: String(row.cta ?? DEFAULT_COMBO_BANNER.cta),
      href: String(row.href ?? DEFAULT_COMBO_BANNER.href),
      badge: String(row.badge ?? DEFAULT_COMBO_BANNER.badge),
      image: String(row.image ?? DEFAULT_COMBO_BANNER.image),
    };
  } catch {
    return { ...DEFAULT_COMBO_BANNER };
  }
}

export function parseTrustPoints(raw?: string | null): TrustPointItem[] {
  if (!raw?.trim()) return DEFAULT_TRUST_POINTS.map((t) => ({ ...t }));
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || !parsed.length) {
      return DEFAULT_TRUST_POINTS.map((t) => ({ ...t }));
    }
    return parsed
      .map((item) => {
        const row = asObj(item);
        if (!row) return null;
        const label = String(row.label ?? "").trim();
        if (!label) return null;
        return {
          label,
          sub: String(row.sub ?? "").trim(),
        };
      })
      .filter((t): t is TrustPointItem => Boolean(t));
  } catch {
    return DEFAULT_TRUST_POINTS.map((t) => ({ ...t }));
  }
}

export function parseQuickCategories(raw?: string | null): QuickCategoryItem[] {
  if (!raw?.trim()) return DEFAULT_QUICK_CATEGORIES.map((t) => ({ ...t }));
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return DEFAULT_QUICK_CATEGORIES.map((t) => ({ ...t }));
    }
    // Empty array is intentional (admin deleted every shortcut).
    return parsed
      .map((item) => {
        const row = asObj(item);
        if (!row) return null;
        const label = String(row.label ?? "").trim();
        const image = String(row.image ?? "").trim();
        if (!label || !image) return null;
        const href = String(row.href ?? "/pizzas").trim() || "/pizzas";
        const fallbackId = label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        const id =
          String(row.id ?? "").trim() || fallbackId || newQuickCategoryId();
        return { id, label, href, image };
      })
      .filter((t): t is QuickCategoryItem => Boolean(t));
  } catch {
    return DEFAULT_QUICK_CATEGORIES.map((t) => ({ ...t }));
  }
}

export function serializeQuickCategories(items: QuickCategoryItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      id: item.id || newQuickCategoryId(),
      label: item.label.trim(),
      href: item.href.trim() || "/pizzas",
      image: item.image.trim(),
    })),
  );
}

export function parseOrderCta(raw?: string | null): OrderCtaContent {
  if (!raw?.trim()) return { ...DEFAULT_ORDER_CTA };
  try {
    const row = asObj(JSON.parse(raw));
    if (!row) return { ...DEFAULT_ORDER_CTA };
    return {
      title: String(row.title ?? DEFAULT_ORDER_CTA.title),
      copy: String(row.copy ?? DEFAULT_ORDER_CTA.copy),
      primary_label: String(row.primary_label ?? DEFAULT_ORDER_CTA.primary_label),
      primary_href: String(row.primary_href ?? DEFAULT_ORDER_CTA.primary_href),
      secondary_label: String(
        row.secondary_label ?? DEFAULT_ORDER_CTA.secondary_label,
      ),
      secondary_href: String(
        row.secondary_href ?? DEFAULT_ORDER_CTA.secondary_href,
      ),
      image: String(row.image ?? DEFAULT_ORDER_CTA.image),
    };
  } catch {
    return { ...DEFAULT_ORDER_CTA };
  }
}
