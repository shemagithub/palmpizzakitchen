import { Router } from "express";
import { query } from "../db.js";
import { adminRequired } from "../middleware/auth.js";

const router = Router();

const CATEGORIES = new Set([
  "classic",
  "cheese",
  "veggie",
  "meat",
  "side",
  "combo",
  "drink",
  "burger",
]);

function parseDetails(raw) {
  if (!raw) return undefined;
  if (typeof raw === "object") return normalizeDetails(raw);
  try {
    return normalizeDetails(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function parseSizes(input) {
  const raw = input.sizes && typeof input.sizes === "object" ? input.sizes : {};
  const enabled = Boolean(
    raw.enabled === true ||
      raw.enabled === 1 ||
      raw.enabled === "1" ||
      raw.enabled === "true" ||
      input.sizeEnabled ||
      input.sizesEnabled,
  );
  if (!enabled) return undefined;
  const money = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const s = money(raw.s ?? raw.small ?? input.priceSmall);
  const m = money(raw.m ?? raw.medium ?? input.priceMedium);
  const l = money(raw.l ?? raw.large ?? input.priceLarge);
  if (s == null && m == null && l == null) return undefined;
  return {
    enabled: true,
    ...(s != null ? { s } : {}),
    ...(m != null ? { m } : {}),
    ...(l != null ? { l } : {}),
  };
}

const COMBO_SLOT_CATEGORIES = new Set([
  "classic",
  "cheese",
  "veggie",
  "meat",
  "side",
  "drink",
  "burger",
]);

function parseComboSlots(input) {
  const raw = Array.isArray(input?.comboSlots)
    ? input.comboSlots
    : Array.isArray(input?.slots)
      ? input.slots
      : null;
  if (!raw || !raw.length) return undefined;
  const slots = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const id = String(row.id || "").trim();
    const label = String(row.label || "").trim();
    const categories = (
      Array.isArray(row.categories) ? row.categories : []
    )
      .map((c) => String(c).trim().toLowerCase())
      .filter((c) => COMBO_SLOT_CATEGORIES.has(c));
    if (!id || !label || !categories.length) continue;
    const itemIds = Array.isArray(row.itemIds)
      ? row.itemIds.map((x) => String(x).trim()).filter(Boolean)
      : [];
    slots.push({
      id,
      label,
      categories,
      ...(itemIds.length ? { itemIds } : {}),
    });
  }
  return slots.length ? slots : undefined;
}

function normalizeDetails(input) {
  if (!input || typeof input !== "object") return undefined;
  const list = (v) =>
    Array.isArray(v)
      ? v.map((x) => String(x).trim()).filter(Boolean)
      : typeof v === "string"
        ? v
            .split(/\n|,/)
            .map((x) => x.trim())
            .filter(Boolean)
        : [];

  const sizes = parseSizes(input);
  const comboSlots = parseComboSlots(input);
  const out = {
    ingredients: list(input.ingredients),
    allergens: list(input.allergens),
    highlights: list(input.highlights),
    prepTime: String(input.prepTime || "").trim(),
    calories: String(input.calories || "").trim(),
    serves: String(input.serves || "").trim(),
    longDescription: String(input.longDescription || "").trim(),
    ...(sizes ? { sizes } : {}),
    ...(comboSlots ? { comboSlots } : {}),
  };

  const hasAny =
    out.ingredients.length ||
    out.allergens.length ||
    out.highlights.length ||
    out.prepTime ||
    out.calories ||
    out.serves ||
    out.longDescription ||
    Boolean(sizes) ||
    Boolean(comboSlots);

  return hasAny ? out : undefined;
}

function serializeDetails(raw) {
  const details = normalizeDetails(raw) || {};
  const sizes = parseSizes(raw && typeof raw === "object" ? raw : {});
  if (sizes) {
    details.sizes = sizes;
  } else if (
    raw &&
    typeof raw === "object" &&
    raw.sizes &&
    (raw.sizes.enabled === false ||
      raw.sizes.enabled === 0 ||
      raw.sizes.enabled === "0" ||
      raw.sizes.enabled === "false")
  ) {
    delete details.sizes;
  }
  const comboSlots = parseComboSlots(
    raw && typeof raw === "object" ? raw : {},
  );
  if (comboSlots) {
    details.comboSlots = comboSlots;
  } else if (
    raw &&
    typeof raw === "object" &&
    (Array.isArray(raw.comboSlots) || raw.comboSlots === null)
  ) {
    delete details.comboSlots;
  }
  const hasAny =
    (details.ingredients && details.ingredients.length) ||
    (details.allergens && details.allergens.length) ||
    (details.highlights && details.highlights.length) ||
    details.prepTime ||
    details.calories ||
    details.serves ||
    details.longDescription ||
    details.sizes ||
    (details.comboSlots && details.comboSlots.length);
  return hasAny ? JSON.stringify(details) : null;
}

function mapItem(row, images = []) {
  const gallery = images.length ? images : [row.image];
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    image: row.image,
    images: gallery,
    rating: Number(row.rating),
    reviews: Number(row.reviews),
    badge: row.badge || undefined,
    category: row.category,
    details: parseDetails(row.details),
    active: Boolean(row.active),
  };
}

function normalizeImageList(body, fallbackImage) {
  const fromBody = Array.isArray(body?.images)
    ? body.images.map((u) => String(u || "").trim()).filter(Boolean)
    : [];
  const main = String(body?.image || fallbackImage || "").trim();
  const unique = [];
  for (const url of [main, ...fromBody]) {
    if (url && !unique.includes(url)) unique.push(url);
  }
  return unique;
}

async function loadImagesByItemIds(ids) {
  const map = new Map();
  if (!ids.length) return map;
  const placeholders = ids.map(() => "?").join(",");
  const rows = await query(
    `SELECT item_id, image_url FROM menu_images
     WHERE item_id IN (${placeholders})
     ORDER BY sort_order, id`,
    ids,
  );
  for (const row of rows) {
    const list = map.get(row.item_id) || [];
    list.push(row.image_url);
    map.set(row.item_id, list);
  }
  return map;
}

async function replaceImages(itemId, images) {
  await query(`DELETE FROM menu_images WHERE item_id = ?`, [itemId]);
  for (let i = 0; i < images.length; i++) {
    await query(
      `INSERT INTO menu_images (item_id, image_url, sort_order) VALUES (?, ?, ?)`,
      [itemId, images[i], i],
    );
  }
}

async function fetchMappedItem(id) {
  const rows = await query(`SELECT * FROM menu_items WHERE id = ?`, [id]);
  if (!rows.length) return null;
  const images = await query(
    `SELECT image_url FROM menu_images WHERE item_id = ? ORDER BY sort_order, id`,
    [id],
  );
  return mapItem(
    rows[0],
    images.map((i) => i.image_url),
  );
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

async function uniqueId(base) {
  let id = base || `item-${Date.now()}`;
  let n = 0;
  while (true) {
    const candidate = n === 0 ? id : `${id}-${n}`;
    const rows = await query(`SELECT id FROM menu_items WHERE id = ?`, [
      candidate,
    ]);
    if (!rows.length) return candidate;
    n += 1;
  }
}

router.get("/", async (req, res) => {
  try {
    const { category, q } = req.query;
    let sql = `SELECT * FROM menu_items WHERE active = 1`;
    const params = [];

    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }
    if (q) {
      sql += ` AND (name LIKE ? OR description LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }
    sql += ` ORDER BY category, name`;

    const rows = await query(sql, params);
    const imageMap = await loadImagesByItemIds(rows.map((r) => r.id));
    res.json({
      items: rows.map((r) => mapItem(r, imageMap.get(r.id) || [])),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/manage", adminRequired, async (_req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM menu_items ORDER BY active DESC, category, name`,
    );
    const imageMap = await loadImagesByItemIds(rows.map((r) => r.id));
    res.json({
      items: rows.map((r) => mapItem(r, imageMap.get(r.id) || [])),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await fetchMappedItem(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found." });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", adminRequired, async (req, res) => {
  try {
    const {
      id: rawId,
      name,
      description,
      price,
      image,
      category,
      badge,
      rating = 4.8,
      reviews = 0,
      active = 1,
      details,
    } = req.body || {};

    if (!name || !description || price == null || !image || !category) {
      return res.status(400).json({ error: "Missing required menu fields." });
    }
    if (!CATEGORIES.has(category)) {
      return res.status(400).json({ error: "Invalid category." });
    }
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: "Invalid price." });
    }

    const id = await uniqueId(rawId ? slugify(rawId) : slugify(name));
    const gallery = normalizeImageList(req.body, image);
    const primary = gallery[0] || image.trim();

    await query(
      `INSERT INTO menu_items
        (id, name, description, price, image, rating, reviews, badge, category, details, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name.trim(),
        description.trim(),
        numericPrice,
        primary,
        Number(rating) || 4.8,
        Number(reviews) || 0,
        badge?.trim() || null,
        category,
        serializeDetails(details),
        active ? 1 : 0,
      ],
    );

    await replaceImages(id, gallery);

    const item = await fetchMappedItem(id);
    res.status(201).json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", adminRequired, async (req, res) => {
  try {
    const existing = await query(`SELECT id FROM menu_items WHERE id = ?`, [
      req.params.id,
    ]);
    if (!existing.length) {
      return res.status(404).json({ error: "Item not found." });
    }

    const {
      name,
      description,
      price,
      image,
      category,
      badge,
      rating,
      reviews,
      active,
      details,
    } = req.body || {};

    if (!name || !description || price == null || !image || !category) {
      return res.status(400).json({ error: "Missing required menu fields." });
    }
    if (!CATEGORIES.has(category)) {
      return res.status(400).json({ error: "Invalid category." });
    }
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: "Invalid price." });
    }

    const gallery = normalizeImageList(req.body, image);
    const primary = gallery[0] || image.trim();

    await query(
      `UPDATE menu_items
       SET name = ?, description = ?, price = ?, image = ?, category = ?,
           badge = ?, rating = ?, reviews = ?, details = ?, active = ?
       WHERE id = ?`,
      [
        name.trim(),
        description.trim(),
        numericPrice,
        primary,
        category,
        badge?.trim() || null,
        Number(rating) || 4.8,
        Number(reviews) || 0,
        serializeDetails(details),
        active ? 1 : 0,
        req.params.id,
      ],
    );

    await replaceImages(req.params.id, gallery);

    const item = await fetchMappedItem(req.params.id);
    res.json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", adminRequired, async (req, res) => {
  try {
    const fields = [
      "name",
      "description",
      "price",
      "image",
      "badge",
      "category",
      "active",
      "rating",
      "reviews",
    ];
    const updates = [];
    const params = [];
    for (const key of fields) {
      if (req.body?.[key] !== undefined) {
        updates.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    }
    if (req.body?.details !== undefined) {
      updates.push("details = ?");
      params.push(serializeDetails(req.body.details));
    }
    if (!updates.length && req.body?.images === undefined) {
      return res.status(400).json({ error: "No fields to update." });
    }
    if (updates.length) {
      params.push(req.params.id);
      await query(
        `UPDATE menu_items SET ${updates.join(", ")} WHERE id = ?`,
        params,
      );
    }
    if (Array.isArray(req.body?.images)) {
      const current = await query(`SELECT image FROM menu_items WHERE id = ?`, [
        req.params.id,
      ]);
      if (!current.length) {
        return res.status(404).json({ error: "Item not found." });
      }
      const gallery = normalizeImageList(
        { image: req.body.image ?? current[0].image, images: req.body.images },
        current[0].image,
      );
      if (gallery[0] && gallery[0] !== current[0].image) {
        await query(`UPDATE menu_items SET image = ? WHERE id = ?`, [
          gallery[0],
          req.params.id,
        ]);
      }
      await replaceImages(req.params.id, gallery);
    }

    const item = await fetchMappedItem(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found." });
    res.json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", adminRequired, async (req, res) => {
  try {
    const rows = await query(`SELECT id FROM menu_items WHERE id = ?`, [
      req.params.id,
    ]);
    if (!rows.length) return res.status(404).json({ error: "Item not found." });

    await query(`DELETE FROM menu_items WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
