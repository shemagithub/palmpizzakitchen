export type ProductSizeId = "s" | "m" | "l";

export type ProductSizePrices = {
  enabled: boolean;
  /** Single promo price — no size picker (e.g. burgers). */
  flat?: number;
  s?: number;
  m?: number;
  l?: number;
};

export const PRODUCT_SIZE_OPTIONS: {
  id: ProductSizeId;
  label: string;
}[] = [
  { id: "s", label: "Small" },
  { id: "m", label: "Medium" },
  { id: "l", label: "Large" },
];

export type AlcoholKind =
  | "wine"
  | "champagne"
  | "beer"
  | "cocktail"
  | "spirit"
  | "other";

export const ALCOHOL_KINDS: {
  id: AlcoholKind;
  label: string;
  hint: string;
}[] = [
  { id: "wine", label: "Wine", hint: "Red, white, and rosé" },
  { id: "champagne", label: "Champagne", hint: "Sparkling wine" },
  { id: "beer", label: "Beer", hint: "Bottles and cans" },
  { id: "cocktail", label: "Cocktail", hint: "Mixed drinks" },
  { id: "spirit", label: "Spirits", hint: "Whisky, gin, rum, and similar" },
  { id: "other", label: "Other alcohol", hint: "Anything else for guests 18+" },
];

export function normalizeAlcoholKind(raw: unknown): AlcoholKind | undefined {
  const value = String(raw || "")
    .trim()
    .toLowerCase();
  return ALCOHOL_KINDS.some((kind) => kind.id === value)
    ? (value as AlcoholKind)
    : undefined;
}

export function alcoholKindLabel(kind?: string | null) {
  return ALCOHOL_KINDS.find((row) => row.id === kind)?.label || "Other alcohol";
}

/** One pick inside a combo (e.g. "Choose your pizza", "Choose a drink"). */
export type ComboSlot = {
  id: string;
  label: string;
  /** Categories the customer can pick from */
  categories: MenuItem["category"][];
  /** Optional allow-list; empty/undefined = all active items in those categories */
  itemIds?: string[];
};

export type ComboChoice = {
  slotId: string;
  itemId: string;
  itemName: string;
};

export type ProductDetails = {
  ingredients: string[];
  prepTime: string;
  calories: string;
  serves: string;
  allergens: string[];
  highlights: string[];
  longDescription: string;
  sizes?: ProductSizePrices;
  /** When set on a combo, customer must pick one product per slot before add-to-cart */
  comboSlots?: ComboSlot[];
  /** Wine, champagne, beer, and the rest of the bar list */
  alcoholKind?: AlcoholKind;
};

export const PIZZA_CATEGORY_SLUGS: MenuItem["category"][] = [
  "classic",
  "cheese",
  "veggie",
  "meat",
];

export const COMBO_SLOT_PRESETS: {
  id: string;
  label: string;
  categories: MenuItem["category"][];
}[] = [
  { id: "pizza", label: "Choose your pizza", categories: [...PIZZA_CATEGORY_SLUGS] },
  { id: "drink", label: "Choose your drink", categories: ["drink"] },
  { id: "side", label: "Choose a side", categories: ["side"] },
  { id: "fruit", label: "Choose fruit parts", categories: ["fruit"] },
  { id: "alcohol", label: "Choose wine or alcohol", categories: ["alcohol"] },
  { id: "burger", label: "Choose a burger", categories: ["burger"] },
];

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  images?: string[];
  rating: number;
  reviews: number;
  badge?: string;
  category:
    | "classic"
    | "cheese"
    | "veggie"
    | "meat"
    | "side"
    | "combo"
    | "drink"
    | "burger"
    | "fruit"
    | "alcohol";
  /** Editable product-page fields from admin / API */
  details?: Partial<ProductDetails>;
};

export const CATEGORIES = [
  {
    slug: "classic",
    title: "Classic Pizzas",
    href: "/pizzas?category=classic",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=700&q=70",
    tone: "from-[#9b1c1c] via-[#6b1212] to-[#2a0808]",
  },
  {
    slug: "cheese",
    title: "Cheese Pizzas",
    href: "/pizzas?category=cheese",
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=700&q=70",
    tone: "from-[#c45a12] via-[#9a3d0c] to-[#3d1606]",
  },
  {
    slug: "veggie",
    title: "Veggie Pizzas",
    href: "/pizzas?category=veggie",
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=700&q=70",
    tone: "from-[#8b1a1a] via-[#5c1010] to-[#220808]",
  },
  {
    slug: "meat",
    title: "Meat Lovers",
    href: "/pizzas?category=meat",
    image:
      "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=700&q=70",
    tone: "from-[#6b3a1f] via-[#3d2112] to-[#1a0e08]",
  },
] as const;

export const PIZZAS: MenuItem[] = [
  {
    id: "pepperoni-delight",
    name: "Pepperoni Delight",
    description: "Loaded pepperoni, mozzarella, and our signature tomato sauce.",
    price: 18000,
    image:
      "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=70",
    rating: 5,
    reviews: 128,
    badge: "BESTSELLER",
    category: "meat",
  },
  {
    id: "cheese-burst",
    name: "Cheese Burst",
    description: "Triple cheese melt with creamy mozzarella edges.",
    price: 16000,
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=70",
    rating: 5,
    reviews: 96,
    badge: "POPULAR",
    category: "cheese",
  },
  {
    id: "veggie-supreme",
    name: "Veggie Supreme",
    description: "Peppers, olives, mushrooms, onion, and fresh basil.",
    price: 15000,
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=70",
    rating: 4.8,
    reviews: 84,
    badge: "NEW",
    category: "veggie",
  },
  {
    id: "bbq-chicken",
    name: "BBQ Chicken",
    description: "Smoky BBQ sauce, grilled chicken, red onion, and cilantro.",
    price: 19000,
    image:
      "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=600&q=70",
    rating: 4.9,
    reviews: 112,
    badge: "BESTSELLER",
    category: "meat",
  },
  {
    id: "margherita",
    name: "Margherita Classic",
    description: "San Marzano tomatoes, fresh mozzarella, and basil.",
    price: 14000,
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=70",
    rating: 4.7,
    reviews: 76,
    category: "classic",
  },
  {
    id: "hawaiian",
    name: "Hawaiian Heat",
    description: "Ham, pineapple, chili flakes, and mozzarella.",
    price: 17500,
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=70",
    rating: 4.6,
    reviews: 64,
    category: "classic",
  },
  {
    id: "four-cheese",
    name: "Four Cheese",
    description: "Mozzarella, cheddar, parmesan, and gorgonzola.",
    price: 18000,
    image:
      "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=70",
    rating: 4.8,
    reviews: 91,
    category: "cheese",
  },
  {
    id: "garden-fresh",
    name: "Garden Fresh",
    description: "Zucchini, cherry tomatoes, spinach, and feta.",
    price: 15500,
    image:
      "https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?auto=format&fit=crop&w=600&q=70",
    rating: 4.5,
    reviews: 52,
    category: "veggie",
  },
];

export const COMBOS: MenuItem[] = [
  {
    id: "family-feast",
    name: "Family Feast",
    description: "2 large pizzas, garlic bread, and a 1.5L drink.",
    price: 42000,
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=70",
    rating: 4.9,
    reviews: 140,
    category: "combo",
  },
  {
    id: "couple-combo",
    name: "Couple Combo",
    description: "1 medium pizza, 2 sides, and 2 soft drinks.",
    price: 27000,
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=70",
    rating: 4.8,
    reviews: 98,
    category: "combo",
  },
  {
    id: "party-pack",
    name: "Party Pack",
    description: "3 large pizzas, wings, breadsticks, and fruit.",
    price: 63000,
    image:
      "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=400&q=70",
    rating: 5,
    reviews: 121,
    category: "combo",
  },
  {
    id: "lunch-deal",
    name: "Lunch Deal",
    description: "Personal pizza, side salad, and a drink.",
    price: 17000,
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=70",
    rating: 4.7,
    reviews: 67,
    category: "combo",
  },
];

export const SIDES: MenuItem[] = [
  {
    id: "garlic-bread",
    name: "Garlic Bread",
    description: "Toasted baguette with garlic butter and herbs.",
    price: 6000,
    image:
      "https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&w=400&q=70",
    rating: 4.8,
    reviews: 88,
    category: "side",
  },
  {
    id: "chicken-wings",
    name: "Chicken Wings",
    description: "Crispy wings tossed in your choice of sauce.",
    price: 11000,
    image:
      "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=400&q=70",
    rating: 4.9,
    reviews: 102,
    category: "side",
  },
  {
    id: "mozzarella-sticks",
    name: "Mozzarella Sticks",
    description: "Golden fried mozzarella with marinara dip.",
    price: 8500,
    image:
      "https://images.unsplash.com/photo-1531749668029-2db88e4276c7?auto=format&fit=crop&w=400&q=70",
    rating: 4.7,
    reviews: 74,
    category: "side",
  },
  {
    id: "onion-rings",
    name: "Onion Rings",
    description: "Crispy battered onion rings with spicy mayo.",
    price: 7000,
    image:
      "https://images.unsplash.com/photo-1639024471283-035266509557?auto=format&fit=crop&w=400&q=70",
    rating: 4.6,
    reviews: 59,
    category: "side",
  },
  {
    id: "caesar-salad",
    name: "Caesar Salad",
    description: "Romaine, croutons, parmesan, and Caesar dressing.",
    price: 9000,
    image:
      "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=400&q=70",
    rating: 4.5,
    reviews: 41,
    category: "side",
  },
  {
    id: "choc-lava",
    name: "Choco Lava Cake",
    description: "Warm chocolate cake with a molten center.",
    price: 7500,
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=70",
    rating: 4.9,
    reviews: 93,
    category: "side",
  },
];

export const DRINKS: MenuItem[] = [
  {
    id: "coca-cola",
    name: "Coca-Cola",
    description: "Classic Coca-Cola soft drink, ice-cold and ready to pair with pizza.",
    price: 1500,
    image:
      "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=70",
    rating: 4.8,
    reviews: 210,
    category: "drink",
  },
  {
    id: "fanta-orange",
    name: "Fanta Orange",
    description: "Bright orange soda with a sweet citrus kick.",
    price: 1500,
    image:
      "https://images.unsplash.com/photo-1624517452488-04869289c4ca?auto=format&fit=crop&w=400&q=70",
    rating: 4.7,
    reviews: 96,
    category: "drink",
  },
  {
    id: "sprite",
    name: "Sprite",
    description: "Crisp lemon-lime soda to refresh every bite.",
    price: 1500,
    image:
      "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&w=400&q=70",
    rating: 4.7,
    reviews: 88,
    category: "drink",
  },
  {
    id: "water-bottle",
    name: "Bottled Water",
    description: "Still mineral water for a clean, simple sip.",
    price: 1000,
    image:
      "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=400&q=70",
    rating: 4.6,
    reviews: 54,
    category: "drink",
  },
  {
    id: "fresh-juice",
    name: "Fresh Juice",
    description: "Seasonal fruit juice blended fresh in the kitchen.",
    price: 2500,
    image:
      "https://images.unsplash.com/photo-1600271886742-f049cd465b98?auto=format&fit=crop&w=400&q=70",
    rating: 4.9,
    reviews: 72,
    badge: "FRESH",
    category: "drink",
  },
  {
    id: "cola-1-5l",
    name: "Soft Drink 1.5L",
    description: "Family-size soft drink bottle - perfect with combos and sharing.",
    price: 3500,
    image:
      "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=70",
    rating: 4.8,
    reviews: 131,
    category: "drink",
  },
];

export const BURGERS: MenuItem[] = [
  {
    id: "classic-beef-burger",
    name: "Classic Beef Burger",
    description: "Juicy beef patty, cheddar, lettuce, tomato, and house sauce.",
    price: 8500,
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=70",
    rating: 4.8,
    reviews: 164,
    badge: "BESTSELLER",
    category: "burger",
  },
  {
    id: "cheese-burger",
    name: "Double Cheese Burger",
    description: "Two beef patties stacked with melted cheddar and pickles.",
    price: 10500,
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=70",
    rating: 4.9,
    reviews: 128,
    category: "burger",
  },
  {
    id: "chicken-burger",
    name: "Crispy Chicken Burger",
    description: "Crispy fried chicken, mayo, lettuce, and soft toasted bun.",
    price: 9000,
    image:
      "https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=400&q=70",
    rating: 4.7,
    reviews: 97,
    category: "burger",
  },
  {
    id: "bbq-burger",
    name: "BBQ Bacon Burger",
    description: "Beef patty, smoky BBQ sauce, crispy bacon, and onion rings.",
    price: 11000,
    image:
      "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=400&q=70",
    rating: 4.8,
    reviews: 112,
    badge: "NEW",
    category: "burger",
  },
  {
    id: "veggie-burger",
    name: "Garden Veggie Burger",
    description: "Plant-based patty with avocado, tomato, and herb mayo.",
    price: 8000,
    image:
      "https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=400&q=70",
    rating: 4.6,
    reviews: 61,
    category: "burger",
  },
];

export const FRUIT: MenuItem[] = [
  {
    id: "fresh-fruit-cup",
    name: "Fresh Fruit Cup",
    description: "Seasonal fruit cut into a chilled cup.",
    price: 4500,
    image:
      "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=400&q=70",
    rating: 4.8,
    reviews: 42,
    badge: "FRESH",
    category: "fruit",
  },
  {
    id: "watermelon-slices",
    name: "Watermelon Slices",
    description: "Cold watermelon, cut and ready to share.",
    price: 3500,
    image:
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=400&q=70",
    rating: 4.7,
    reviews: 38,
    category: "fruit",
  },
  {
    id: "tropical-fruit-plate",
    name: "Tropical Fruit Plate",
    description: "Pineapple, mango, and banana on one plate.",
    price: 6500,
    image:
      "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=400&q=70",
    rating: 4.9,
    reviews: 27,
    category: "fruit",
  },
];

export const ALCOHOL: MenuItem[] = [
  {
    id: "house-red-glass",
    name: "House Red — Glass",
    description: "A glass of the house red, poured to order.",
    price: 8000,
    image:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=400&q=70",
    rating: 4.8,
    reviews: 36,
    category: "alcohol",
    details: { alcoholKind: "wine" },
  },
  {
    id: "house-red-bottle",
    name: "House Red — Bottle",
    description: "A full bottle of the house red for the table.",
    price: 28000,
    image:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=400&q=70",
    rating: 4.8,
    reviews: 22,
    category: "alcohol",
    details: { alcoholKind: "wine" },
  },
  {
    id: "house-white-glass",
    name: "House White — Glass",
    description: "A chilled glass of the house white.",
    price: 8000,
    image:
      "https://images.unsplash.com/photo-1474722883778-792e7990302f?auto=format&fit=crop&w=400&q=70",
    rating: 4.7,
    reviews: 28,
    category: "alcohol",
    details: { alcoholKind: "wine" },
  },
  {
    id: "champagne-glass",
    name: "Champagne — Glass",
    description: "A chilled glass of champagne.",
    price: 14000,
    image:
      "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=400&q=70",
    rating: 4.9,
    reviews: 19,
    badge: "CELEBRATE",
    category: "alcohol",
    details: { alcoholKind: "champagne" },
  },
  {
    id: "chilled-beer",
    name: "Chilled Beer",
    description: "A cold bottle of beer.",
    price: 4000,
    image:
      "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=400&q=70",
    rating: 4.6,
    reviews: 74,
    category: "alcohol",
    details: { alcoholKind: "beer" },
  },
  {
    id: "palm-spritz",
    name: "Palm Spritz",
    description: "A light sparkling cocktail with citrus.",
    price: 9000,
    image:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=400&q=70",
    rating: 4.8,
    reviews: 31,
    category: "alcohol",
    details: { alcoholKind: "cocktail" },
  },
  {
    id: "whisky-pour",
    name: "Whisky Pour",
    description: "A single pour of whisky.",
    price: 10000,
    image:
      "https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=400&q=70",
    rating: 4.7,
    reviews: 17,
    category: "alcohol",
    details: { alcoholKind: "spirit" },
  },
];

export const MENU_ADMIN_CATEGORIES: {
  id: MenuItem["category"];
  label: string;
}[] = [
  { id: "classic", label: "Classic pizza" },
  { id: "cheese", label: "Cheese pizza" },
  { id: "veggie", label: "Veggie pizza" },
  { id: "meat", label: "Meat pizza" },
  { id: "burger", label: "Burger" },
  { id: "side", label: "Side" },
  { id: "fruit", label: "Fruit parts" },
  { id: "drink", label: "Soft drink" },
  { id: "alcohol", label: "Wine & alcohol" },
  { id: "combo", label: "Combo" },
];

export function formatPrice(value: number) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

function asMoney(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function isSizesFlagOn(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}

/** Normalize size prices from API / admin so the storefront can read them reliably. */
export function normalizeSizePrices(
  raw: unknown,
): ProductSizePrices | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const data = raw as Record<string, unknown>;
  if (!isSizesFlagOn(data.enabled)) return undefined;
  const flat = asMoney(data.flat ?? data.onePrice);
  const s = asMoney(data.s ?? data.small);
  const m = asMoney(data.m ?? data.medium);
  const l = asMoney(data.l ?? data.large);
  if (flat != null && s == null && m == null && l == null) {
    return { enabled: true, flat };
  }
  if (s == null && m == null && l == null) return undefined;
  return {
    enabled: true,
    ...(flat != null ? { flat } : {}),
    ...(s != null ? { s } : {}),
    ...(m != null ? { m } : {}),
    ...(l != null ? { l } : {}),
  };
}

/** Only when admin turned sizes on and entered at least one size price. */
export function getEnabledSizes(
  item: { details?: Partial<ProductDetails> | null } | null | undefined,
): ProductSizePrices | null {
  return normalizeSizePrices(item?.details?.sizes) || null;
}

export function availableSizeOptions(sizes: ProductSizePrices | null | undefined) {
  if (!sizes?.enabled) return [];
  return PRODUCT_SIZE_OPTIONS.filter((option) => asMoney(sizes[option.id]) != null);
}

export function defaultSizeId(sizes: ProductSizePrices | null | undefined): ProductSizeId {
  const options = availableSizeOptions(sizes);
  if (!options.length) return "m";
  const prefer = options.find((o) => o.id === "m") || options[0];
  return prefer.id;
}

export function sizePrice(
  sizes: ProductSizePrices | null | undefined,
  id: ProductSizeId,
) {
  return asMoney(sizes?.[id]) ?? 0;
}

export function sizeLabel(id: ProductSizeId) {
  return PRODUCT_SIZE_OPTIONS.find((option) => option.id === id)?.label || "Medium";
}

export function itemListPrice(item: {
  price: number;
  details?: Partial<ProductDetails> | null;
}) {
  const sizes = getEnabledSizes(item);
  if (!sizes) return item.price;
  const values = [sizes.s, sizes.m, sizes.l]
    .map((v) => asMoney(v))
    .filter((v): v is number => v != null);
  return values.length ? Math.min(...values) : item.price;
}

export function normalizeComboSlots(
  raw: unknown,
): ComboSlot[] | undefined {
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const allowed = new Set<MenuItem["category"]>([
    "classic",
    "cheese",
    "veggie",
    "meat",
    "side",
    "drink",
    "fruit",
    "alcohol",
    "burger",
  ]);
  const slots: ComboSlot[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = String(r.id || "").trim();
    const label = String(r.label || "").trim();
    const categories = (
      Array.isArray(r.categories) ? r.categories : []
    )
      .map((c) => {
        const value = String(c).trim().toLowerCase();
        return value === "dessert" ? "fruit" : value;
      })
      .filter((c): c is MenuItem["category"] =>
        allowed.has(c as MenuItem["category"]),
      );
    if (!id || !label || !categories.length) continue;
    const itemIds = Array.isArray(r.itemIds)
      ? r.itemIds.map((x) => String(x).trim()).filter(Boolean)
      : undefined;
    slots.push({
      id,
      label,
      categories,
      ...(itemIds?.length ? { itemIds } : {}),
    });
  }
  return slots.length ? slots : undefined;
}

export function getComboSlots(
  item: { details?: Partial<ProductDetails> | null; category?: string } | null | undefined,
): ComboSlot[] {
  if (!item || item.category !== "combo") return [];
  return normalizeComboSlots(item.details?.comboSlots) || [];
}

export function comboNeedsChoices(
  item: { details?: Partial<ProductDetails> | null; category?: string } | null | undefined,
) {
  return getComboSlots(item).length > 0;
}

export function optionsForComboSlot(
  slot: ComboSlot,
  catalog: MenuItem[],
): MenuItem[] {
  const catSet = new Set(slot.categories);
  const allow = slot.itemIds?.length ? new Set(slot.itemIds) : null;
  return catalog.filter((m) => {
    if (m.category === "combo") return false;
    if (!catSet.has(m.category)) return false;
    if (allow && !allow.has(m.id)) return false;
    return true;
  });
}

export function formatComboChoicesLabel(choices: ComboChoice[] | undefined) {
  if (!choices?.length) return "";
  return choices.map((c) => c.itemName).filter(Boolean).join(" · ");
}

export function comboLineDisplayName(
  comboName: string,
  choices: ComboChoice[] | undefined,
) {
  const picks = formatComboChoicesLabel(choices);
  return picks ? `${comboName} (${picks})` : comboName;
}

export function comboChoicesKey(choices: ComboChoice[] | undefined) {
  if (!choices?.length) return "";
  return choices
    .map((c) => `${c.slotId}=${c.itemId}`)
    .sort()
    .join("|");
}

export function getAllMenuItems(): MenuItem[] {
  return [...PIZZAS, ...COMBOS, ...SIDES, ...DRINKS, ...BURGERS, ...FRUIT, ...ALCOHOL];
}

export function getMenuItem(id: string): MenuItem | undefined {
  return getAllMenuItems().find((item) => item.id === id);
}

export function getRelatedItems(item: MenuItem, limit = 4): MenuItem[] {
  return getAllMenuItems()
    .filter((other) => other.id !== item.id && other.category === item.category)
    .slice(0, limit);
}

const GALLERY_POOLS: Record<MenuItem["category"], string[]> = {
  classic: [
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=70",
  ],
  cheese: [
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=70",
  ],
  veggie: [
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=1000&q=70",
  ],
  meat: [
    "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=1000&q=70",
  ],
  combo: [
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&w=1000&q=70",
  ],
  side: [
    "https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1531749668029-2db88e4276c7?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1639024471283-035266509557?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=1000&q=70",
  ],
  drink: [
    "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1624517452488-04869289c4ca?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1600271886742-f049cd465b98?auto=format&fit=crop&w=1000&q=70",
  ],
  burger: [
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=1000&q=70",
  ],
  fruit: [
    "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=1000&q=70",
  ],
  alcohol: [
    "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1474722883778-792e7990302f?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=1000&q=70",
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1000&q=70",
  ],
};

/** Gallery photos from the database/API only (main image first). */
export function getProductImages(item: MenuItem): string[] {
  const extras = (item.images ?? []).filter(Boolean);
  return Array.from(new Set([item.image, ...extras].filter(Boolean)));
}

const DETAILS: Record<string, Partial<ProductDetails>> = {
  "pepperoni-delight": {
    ingredients: [
      "Hand-stretched dough",
      "Signature tomato sauce",
      "Mozzarella",
      "Spicy pepperoni",
      "Oregano",
    ],
    calories: "285 kcal / slice",
    serves: "2–3 people",
    highlights: ["Customer favorite", "Extra pepperoni option", "Crispy edge"],
    longDescription:
      "Our most-loved pie - generous pepperoni, stretchy mozzarella, and a lightly charred crust from the stone oven. Perfect for sharing or keeping all to yourself.",
  },
  "cheese-burst": {
    ingredients: ["Dough", "Mozzarella", "Cheddar", "Cream cheese rim", "Herbs"],
    calories: "310 kcal / slice",
    serves: "2 people",
    highlights: ["Triple cheese", "Creamy crust", "Kid favorite"],
    longDescription:
      "A cheese lover’s dream with a molten mozzarella center and a creamy cheese rim that pulls with every bite.",
  },
  "veggie-supreme": {
    ingredients: [
      "Tomato sauce",
      "Mozzarella",
      "Bell peppers",
      "Olives",
      "Mushrooms",
      "Onion",
      "Basil",
    ],
    allergens: ["Gluten", "Dairy"],
    highlights: ["Colorful toppings", "Garden fresh", "Light & tasty"],
    longDescription:
      "Loaded with crisp veggies and fragrant basil for a fresh, colorful pizza that still feels indulgent.",
  },
  "bbq-chicken": {
    ingredients: [
      "BBQ sauce",
      "Grilled chicken",
      "Red onion",
      "Mozzarella",
      "Cilantro",
    ],
    highlights: ["Smoky-sweet", "Protein packed", "Bold flavor"],
    longDescription:
      "Sweet and smoky BBQ sauce meets tender grilled chicken, finished with red onion and fresh cilantro.",
  },
  "family-feast": {
    ingredients: ["2 large pizzas", "Garlic bread", "1.5L soft drink"],
    prepTime: "35–40 min",
    calories: "Feeds a table",
    serves: "4–5 people",
    highlights: ["Best value", "Family night ready", "Mix & match pizzas"],
    longDescription:
      "A full table spread built for sharing - two large pizzas, garlic bread, and a big drink to round it out.",
  },
  "garlic-bread": {
    ingredients: ["Baguette", "Garlic butter", "Parsley", "Sea salt"],
    prepTime: "10–12 min",
    calories: "190 kcal / piece",
    serves: "2 people",
    allergens: ["Gluten", "Dairy"],
    highlights: ["Golden & buttery", "Perfect side", "Shareable"],
    longDescription:
      "Toasted until golden, brushed with garlic butter and herbs - the side everyone reaches for first.",
  },
};

function defaultsFor(item: MenuItem): ProductDetails {
  if (item.category === "combo") {
    return {
      ingredients: item.description.split(",").map((part) => part.trim()),
      prepTime: "30–40 min",
      calories: "Varies by selection",
      serves: "2–5 people",
      allergens: ["Gluten", "Dairy"],
      highlights: ["Great value", "Ready to share", "Popular pick"],
      longDescription: `${item.description} Made fresh at PAM Pizza Kitchen and delivered hot.`,
    };
  }

  if (item.category === "side") {
    return {
      ingredients: item.description
        .replace(/\.$/, "")
        .split(/,| and /)
        .map((part) => part.trim())
        .filter(Boolean),
      prepTime: "10–15 min",
      calories: "150–250 kcal",
      serves: "1–2 people",
      allergens: ["May contain gluten", "Dairy"],
      highlights: ["Crispy & fresh", "Pairs with any pizza", "Quick add-on"],
      longDescription: `${item.description} A tasty companion to any PAM Pizza Kitchen order.`,
    };
  }

  if (item.category === "drink") {
    return {
      ingredients: [item.name],
      prepTime: "Ready now",
      calories: "0–150 kcal",
      serves: "1 person",
      allergens: [],
      highlights: ["Ice-cold", "Pairs with pizza", "Quick add-on"],
      longDescription: `${item.description} Add it to any Palm Pizza Kitchen order.`,
    };
  }

  if (item.category === "fruit") {
    return {
      ingredients: item.description
        .replace(/\.$/, "")
        .split(/,| and /)
        .map((part) => part.trim())
        .filter(Boolean),
      prepTime: "Ready now",
      calories: "40–120 kcal",
      serves: "1 person",
      allergens: [],
      highlights: ["Cut fresh", "Chilled", "Easy add-on"],
      longDescription: `${item.description} Fresh fruit parts from Palm Pizza Kitchen.`,
    };
  }

  if (item.category === "alcohol") {
    const kind = alcoholKindLabel(item.details?.alcoholKind);
    return {
      ingredients: [item.name],
      prepTime: "Poured to order",
      calories: "Varies",
      serves: "1 person",
      allergens: [],
      highlights: [kind, "18+ only", "Pairs with pizza"],
      longDescription: `${item.description} Served to guests 18 and over.`,
      alcoholKind: normalizeAlcoholKind(item.details?.alcoholKind),
    };
  }

  if (item.category === "burger") {
    return {
      ingredients: item.description
        .replace(/\.$/, "")
        .split(/,| and /)
        .map((part) => part.trim())
        .filter(Boolean),
      prepTime: "15–20 min",
      calories: "450–750 kcal",
      serves: "1 person",
      allergens: ["Gluten", "Dairy", "May contain egg"],
      highlights: ["Made to order", "Toasted bun", "Pairs with fries"],
      longDescription: `${item.description} Grilled fresh at Palm Pizza Kitchen.`,
    };
  }

  return {
    ingredients: item.description
      .replace(/\.$/, "")
      .split(/,| and /)
      .map((part) => part.trim())
      .filter(Boolean),
    prepTime: "20–25 min",
    calories: "250–320 kcal / slice",
    serves: "2–3 people",
    allergens: ["Gluten", "Dairy"],
    highlights: ["Stone baked", "Fresh dough daily", "Delivered hot"],
    longDescription: `${item.description} Handcrafted in our kitchen and baked to order for peak flavor.`,
  };
}

export function getProductDetails(item: MenuItem): ProductDetails {
  const fromApi = item.details ?? {};
  const description = String(item.description || "").trim();
  return {
    ingredients: fromApi.ingredients?.length ? fromApi.ingredients : [],
    allergens: fromApi.allergens ?? [],
    highlights: fromApi.highlights?.length ? fromApi.highlights : [],
    prepTime: fromApi.prepTime || "",
    calories: fromApi.calories || "",
    serves: fromApi.serves || "",
    longDescription: fromApi.longDescription || description,
    sizes: normalizeSizePrices(fromApi.sizes),
    comboSlots: normalizeComboSlots(fromApi.comboSlots),
    alcoholKind: normalizeAlcoholKind(fromApi.alcoholKind),
  };
}

export function categoryLabel(category: MenuItem["category"]) {
  const labels: Record<MenuItem["category"], string> = {
    classic: "Classic Pizza",
    cheese: "Cheese Pizza",
    veggie: "Veggie Pizza",
    meat: "Meat Pizza",
    side: "Side",
    combo: "Combo Deal",
    drink: "Drink",
    burger: "Burger",
    fruit: "Fruit parts",
    alcohol: "Wine & alcohol",
  };
  return labels[category];
}

export function categoryPage(category: MenuItem["category"]) {
  switch (category) {
    case "side":
      return { label: "Sides", path: "/sides" };
    case "combo":
      return { label: "Combos", path: "/combos" };
    case "drink":
      return { label: "Drinks", path: "/drinks" };
    case "fruit":
      return { label: "Fruit parts", path: "/fruit" };
    case "alcohol":
      return { label: "Wine & bar", path: "/bar" };
    case "burger":
      return { label: "Burgers", path: "/burgers" };
    default:
      return { label: "Pizzas", path: "/pizzas" };
  }
}

export function categoryDisplay(item: {
  category: MenuItem["category"];
  details?: Partial<ProductDetails> | null;
}) {
  if (item.category === "alcohol") {
    return alcoholKindLabel(item.details?.alcoholKind);
  }
  return categoryLabel(item.category);
}

export function productPath(id: string) {
  return `/product/${encodeURIComponent(id)}/`;
}

/** Full document navigation - required for cPanel static export (avoids RSC 404s). */
export function goToProduct(id: string) {
  if (typeof window === "undefined") return;
  window.location.assign(productPath(id));
}
