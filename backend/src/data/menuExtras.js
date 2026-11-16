/** Fruit parts and bar items. `dessert` stays in the enum so older rows can be moved. */
export const MENU_CATEGORY_ENUM = `ENUM('classic','cheese','veggie','meat','side','combo','drink','burger','dessert','fruit','alcohol') NOT NULL`;

export const FRUIT_STARTERS = [
  {
    id: "tiramisu-cup",
    fromName: "Tiramisu Cup",
    name: "Fresh Fruit Cup",
    description: "Seasonal fruit cut into a chilled cup.",
    price: 4500,
    image:
      "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=400&q=70",
    badge: "FRESH",
  },
  {
    id: "vanilla-ice-cream",
    fromName: "Vanilla Ice Cream",
    name: "Watermelon Slices",
    description: "Cold watermelon, cut and ready to share.",
    price: 3500,
    image:
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=400&q=70",
    badge: null,
  },
  {
    id: "baked-cheesecake",
    fromName: "Baked Cheesecake",
    name: "Tropical Fruit Plate",
    description: "Pineapple, mango, and banana on one plate.",
    price: 6500,
    image:
      "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=400&q=70",
    badge: null,
  },
];

export const MENU_EXTRAS = [
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
    badge: null,
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
    badge: null,
    category: "fruit",
  },
  {
    id: "house-red-glass",
    name: "House Red — Glass",
    description: "A glass of the house red, poured to order.",
    price: 8000,
    image:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=400&q=70",
    rating: 4.8,
    reviews: 36,
    badge: null,
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
    badge: null,
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
    badge: null,
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
    badge: null,
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
    badge: null,
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
    badge: null,
    category: "alcohol",
    details: { alcoholKind: "spirit" },
  },
];
