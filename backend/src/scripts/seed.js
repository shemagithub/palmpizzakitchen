import "../loadEnv.js";
import bcrypt from "bcryptjs";
import { pathToFileURL } from "url";
import { pool, query } from "../db.js";

const MENU = [
  {
    id: "pepperoni-delight",
    name: "Pepperoni Delight",
    description: "Loaded pepperoni, mozzarella, and our signature tomato sauce.",
    price: 18000,
    image:
      "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80",
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
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80",
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
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80",
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
      "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=600&q=80",
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
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80",
    rating: 4.7,
    reviews: 76,
    badge: null,
    category: "classic",
  },
  {
    id: "hawaiian",
    name: "Hawaiian Heat",
    description: "Ham, pineapple, chili flakes, and mozzarella.",
    price: 17500,
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
    rating: 4.6,
    reviews: 64,
    badge: null,
    category: "classic",
  },
  {
    id: "four-cheese",
    name: "Four Cheese",
    description: "Mozzarella, cheddar, parmesan, and gorgonzola.",
    price: 18000,
    image:
      "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80",
    rating: 4.8,
    reviews: 91,
    badge: null,
    category: "cheese",
  },
  {
    id: "garden-fresh",
    name: "Garden Fresh",
    description: "Zucchini, cherry tomatoes, spinach, and feta.",
    price: 15500,
    image:
      "https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?auto=format&fit=crop&w=600&q=80",
    rating: 4.5,
    reviews: 52,
    badge: null,
    category: "veggie",
  },
  {
    id: "family-feast",
    name: "Family Feast",
    description: "2 large pizzas, garlic bread, and a 1.5L drink.",
    price: 42000,
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80",
    rating: 4.9,
    reviews: 140,
    badge: null,
    category: "combo",
  },
  {
    id: "couple-combo",
    name: "Couple Combo",
    description: "1 medium pizza, 2 sides, and 2 soft drinks.",
    price: 27000,
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80",
    rating: 4.8,
    reviews: 98,
    badge: null,
    category: "combo",
  },
  {
    id: "party-pack",
    name: "Party Pack",
    description: "3 large pizzas, wings, breadsticks, and dessert.",
    price: 63000,
    image:
      "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=400&q=80",
    rating: 5,
    reviews: 121,
    badge: null,
    category: "combo",
  },
  {
    id: "lunch-deal",
    name: "Lunch Deal",
    description: "Personal pizza, side salad, and a drink.",
    price: 17000,
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80",
    rating: 4.7,
    reviews: 67,
    badge: null,
    category: "combo",
  },
  {
    id: "garlic-bread",
    name: "Garlic Bread",
    description: "Toasted baguette with garlic butter and herbs.",
    price: 6000,
    image:
      "https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&w=400&q=80",
    rating: 4.8,
    reviews: 88,
    badge: null,
    category: "side",
  },
  {
    id: "chicken-wings",
    name: "Chicken Wings",
    description: "Crispy wings tossed in your choice of sauce.",
    price: 11000,
    image:
      "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=400&q=80",
    rating: 4.9,
    reviews: 102,
    badge: null,
    category: "side",
  },
  {
    id: "mozzarella-sticks",
    name: "Mozzarella Sticks",
    description: "Golden fried mozzarella with marinara dip.",
    price: 8500,
    image:
      "https://images.unsplash.com/photo-1531749668029-2db88e4276c7?auto=format&fit=crop&w=400&q=80",
    rating: 4.7,
    reviews: 74,
    badge: null,
    category: "side",
  },
  {
    id: "onion-rings",
    name: "Onion Rings",
    description: "Crispy battered onion rings with spicy mayo.",
    price: 7000,
    image:
      "https://images.unsplash.com/photo-1639024471283-035266509557?auto=format&fit=crop&w=400&q=80",
    rating: 4.6,
    reviews: 59,
    badge: null,
    category: "side",
  },
  {
    id: "caesar-salad",
    name: "Caesar Salad",
    description: "Romaine, croutons, parmesan, and Caesar dressing.",
    price: 9000,
    image:
      "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=400&q=80",
    rating: 4.5,
    reviews: 41,
    badge: null,
    category: "side",
  },
  {
    id: "choc-lava",
    name: "Choco Lava Cake",
    description: "Warm chocolate cake with a molten center.",
    price: 7500,
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=80",
    rating: 4.9,
    reviews: 93,
    badge: null,
    category: "side",
  },
  {
    id: "coca-cola",
    name: "Coca-Cola",
    description:
      "Classic Coca-Cola soft drink, ice-cold and ready to pair with pizza.",
    price: 1500,
    image:
      "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=70",
    rating: 4.8,
    reviews: 210,
    badge: null,
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
    badge: null,
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
    badge: null,
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
    badge: null,
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
    description:
      "Family-size soft drink bottle - perfect with combos and sharing.",
    price: 3500,
    image:
      "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=70",
    rating: 4.8,
    reviews: 131,
    badge: null,
    category: "drink",
  },
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
    badge: null,
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
    badge: null,
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
    badge: null,
    category: "burger",
  },
];

const OFFERS = [
  {
    id: "OFF-BOGO-BURGER",
    title: "Burger BOGO",
    code: "BOGOBURGER",
    status: "Active",
    ends_on: "Ongoing",
    description:
      "Order any burger and get a second burger free — pick both from the menu.",
    deal_label: "Buy 1 · Get 1 Free",
    terms:
      "Valid on burgers only. Free item must be same burger or equal/lower price.",
    href: "/burgers",
    image_url: "/promo-2.jpg",
    show_on_home: 1,
    menu_item_id: null,
    size_prices: JSON.stringify({ enabled: true, flat: 5500 }),
    offer_type: "bogo",
    eligible_categories: JSON.stringify(["burger"]),
  },
  {
    id: "OFF-BOGO-PIZZA",
    title: "Pizza BOGO",
    code: "BOGOPIZZA",
    status: "Active",
    ends_on: "Ongoing",
    description:
      "Choose the pizza you pay for and pick another pizza free.",
    deal_label: "Buy 1 · Get 1 Free",
    terms:
      "Valid on classic, cheese, veggie & meat pizzas. Free pizza same size or cheaper.",
    href: "/pizzas",
    image_url: "/promo-1.jpg",
    show_on_home: 1,
    menu_item_id: null,
    size_prices: JSON.stringify({ enabled: true, m: 10000, l: 12000 }),
    offer_type: "bogo",
    eligible_categories: JSON.stringify([
      "classic",
      "cheese",
      "veggie",
      "meat",
    ]),
  },
  {
    id: "OFF-01",
    title: "Family Feast 30% Off",
    code: "FAMILY30",
    status: "Active",
    ends_on: "Aug 31, 2026",
    description: "Save on selected family combos.",
    deal_label: "Family deal",
    href: "/combos",
    image_url: "/promo-2.jpg",
    show_on_home: 1,
  },
  {
    id: "OFF-02",
    title: "Free Delivery 25,000 RWF+",
    code: "FREEDEL",
    status: "Active",
    ends_on: "Ongoing",
    description: "Free delivery on orders over 25,000 RWF.",
    deal_label: "Free delivery",
    href: "/pizzas",
    image_url: "/promo-1.jpg",
    show_on_home: 1,
  },
  {
    id: "OFF-03",
    title: "Weekday Lunch Deal",
    code: "LUNCH12",
    status: "Scheduled",
    ends_on: "Sep 15, 2026",
    description: "Lunch specials Mon–Fri before 3 PM — pick your pizza.",
    deal_label: "Mon–Fri · Before 3 PM",
    href: "/pizzas",
    image_url: "/promo-3.jpg",
    show_on_home: 0,
    offer_type: "fixed_price",
    eligible_categories: JSON.stringify([
      "classic",
      "cheese",
      "veggie",
      "meat",
    ]),
    size_prices: JSON.stringify({ enabled: true, s: 8000, m: 10000, l: 12000 }),
  },
];

async function seed() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const customerHash = await bcrypt.hash("customer123", 10);

  await query(
    `INSERT INTO users (name, email, password_hash, role, phone, email_verified)
     VALUES (?, ?, ?, 'admin', ?, 1)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin', email_verified = 1`,
    ["Palm Admin", "admin@palmpizza.com", adminHash, "+250 788 000 100"],
  );

  await query(
    `INSERT INTO users (name, email, password_hash, role, phone, email_verified)
     VALUES (?, ?, ?, 'customer', ?, 1)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), email_verified = 1`,
    ["Alex Rivera", "alex@email.com", customerHash, "+250 788 000 199"],
  );

  for (const item of MENU) {
    await query(
      `INSERT INTO menu_items
        (id, name, description, price, image, rating, reviews, badge, category, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         price = VALUES(price),
         image = VALUES(image),
         rating = VALUES(rating),
         reviews = VALUES(reviews),
         badge = VALUES(badge),
         category = VALUES(category),
         active = 1`,
      [
        item.id,
        item.name,
        item.description,
        item.price,
        item.image,
        item.rating,
        item.reviews,
        item.badge,
        item.category,
      ],
    );

    await query(`DELETE FROM menu_images WHERE item_id = ?`, [item.id]);
    // Drinks/burgers keep only their own photo(s); pizzas get a small stock gallery.
    const extras =
      item.category === "drink" || item.category === "burger"
        ? [item.image]
        : [
            item.image,
            "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80",
          ];
    for (let i = 0; i < extras.length; i++) {
      await query(
        `INSERT INTO menu_images (item_id, image_url, sort_order) VALUES (?, ?, ?)`,
        [item.id, extras[i], i],
      );
    }
  }

  for (const offer of OFFERS) {
    await query(
      `INSERT INTO offers
        (id, title, code, status, ends_on, description, deal_label, terms, href, image_url, show_on_home, menu_item_id, size_prices, offer_type, eligible_categories)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         status = VALUES(status),
         ends_on = VALUES(ends_on),
         description = VALUES(description),
         deal_label = VALUES(deal_label),
         terms = VALUES(terms),
         href = VALUES(href),
         image_url = VALUES(image_url),
         show_on_home = VALUES(show_on_home),
         menu_item_id = VALUES(menu_item_id),
         size_prices = VALUES(size_prices),
         offer_type = VALUES(offer_type),
         eligible_categories = VALUES(eligible_categories)`,
      [
        offer.id,
        offer.title,
        offer.code,
        offer.status,
        offer.ends_on,
        offer.description,
        offer.deal_label || null,
        offer.terms || null,
        offer.href || "/pizzas",
        offer.image_url || null,
        offer.show_on_home ?? 1,
        offer.menu_item_id || null,
        offer.size_prices || null,
        offer.offer_type || "general",
        offer.eligible_categories || null,
      ],
    );
  }

  const settings = [
    ["accepting_orders", "1"],
    ["delivery_fee", "1500"],
    ["min_order", "8000"],
    ["kitchen_note", "Extra cheese prep ready for weekend rush."],
    ["open_hours", "11:00 AM – 11:00 PM"],
    ["company_name", "Palm Pizza Kitchen"],
    ["company_tagline", "Hot. Fresh. Delicious."],
    ["logo_url", "/logo.png"],
    [
      "footer_blurb",
      "A neighborhood kitchen for hot pies, easy orders, and nights that smell like melted cheese. Come hungry - leave happy.",
    ],
    [
      "about_text",
      "From dough to delivery, we keep things straightforward - stone ovens, fresh toppings, and packaging that keeps every slice warm.",
    ],
    ["phone", "+250 788 000 199"],
    ["email", "info@palmpizzakitchen.com"],
    ["address", "KN 12 Ave, Kigali, Rwanda"],
    ["social_instagram", "https://instagram.com/"],
    ["social_facebook", ""],
    ["social_tiktok", "https://tiktok.com/"],
    ["social_twitter", "https://x.com/"],
    ["social_whatsapp", "https://wa.me/250788000199"],
    ["promo_badge", "Free delivery 25,000 RWF+"],
    [
      "hero_slides",
      JSON.stringify([
        {
          badge: "LIMITED TIME OFFER",
          title: "MORE CHEESE.",
          accent: "MORE HAPPINESS.",
          copy: "Hot, cheesy and baked with love, just for you.",
          href: "/pizzas",
          cta: "Order Now →",
          image: "/promo-1.png",
        },
        {
          badge: "FAMILY DEAL",
          title: "FEED THE.",
          accent: "WHOLE TABLE.",
          copy: "Combo meals built for sharing - hot and ready fast.",
          href: "/combos",
          cta: "See Combos →",
          image: "/promo-2.png",
        },
        {
          badge: "CRISPY SIDES",
          title: "DIP. CRUNCH.",
          accent: "REPEAT.",
          copy: "Garlic bread, wings, and more to round out your order.",
          href: "/sides",
          cta: "Browse Sides →",
          image: "/promo-3.png",
        },
      ]),
    ],
  ];
  for (const [key, value] of settings) {
    await query(
      `INSERT INTO settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, value],
    );
  }

  // Sample order if none exist
  const existing = await query(`SELECT COUNT(*) AS c FROM orders`);
  if (Number(existing[0].c) === 0) {
    await query(
      `INSERT INTO orders
        (id, user_id, customer_name, phone, address, payment_method, status, subtotal, delivery_fee, total)
       VALUES ('ORD-1048', NULL, 'Maya R.', '+250 788 000 148', 'KN 12 Ave, Kigali', 'card', 'Preparing', 24000, 1500, 25500)`,
    );
    await query(
      `INSERT INTO order_items (order_id, item_id, name, unit_price, quantity)
       VALUES ('ORD-1048', 'pepperoni-delight', 'Pepperoni Delight', 18000, 1),
              ('ORD-1048', 'garlic-bread', 'Garlic Bread', 6000, 1)`,
    );
  }

  console.log("✓ Seed complete");
  console.log("  Admin:    admin@palmpizza.com / admin123");
  console.log("  Customer: alex@email.com / customer123");
}

export async function seedDatabase({ closePool = false } = {}) {
  await seed();
  if (closePool) await pool.end();
}

const isDirectRun =
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  seedDatabase({ closePool: true }).catch(async (err) => {
    console.error("Seed failed:", err.message);
    await pool.end();
    process.exit(1);
  });
}