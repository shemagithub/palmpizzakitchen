import { Router } from "express";
import { query } from "../db.js";
import { adminRequired } from "../middleware/auth.js";

const router = Router();

const STATUSES = new Set(["Active", "Scheduled", "Paused"]);

function slugifyOfferId(title) {
  const base = String(title || "offer")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const n = Math.floor(100 + Math.random() * 900);
  return `OFF-${base || "deal"}-${n}`.slice(0, 40);
}

function normalizeHref(raw) {
  const href = String(raw || "").trim();
  if (!href) return "/pizzas";
  return href.startsWith("/") ? href.slice(0, 200) : `/${href}`.slice(0, 200);
}

function normalizeShowOnHome(value) {
  if (value === false || value === 0 || value === "0") return 0;
  return 1;
}

function parseOfferSizePrices(raw) {
  if (raw == null || raw === "") return null;
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;
  const enabled = Boolean(
    data.enabled === true ||
      data.enabled === 1 ||
      data.enabled === "1" ||
      data.enabled === "true",
  );
  if (!enabled) return null;
  const money = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };
  const s = money(data.s ?? data.small);
  const m = money(data.m ?? data.medium);
  const l = money(data.l ?? data.large);
  if (s == null && m == null && l == null) return null;
  return {
    enabled: true,
    ...(s != null ? { s } : {}),
    ...(m != null ? { m } : {}),
    ...(l != null ? { l } : {}),
  };
}

function serializeOfferSizePrices(raw) {
  const parsed = parseOfferSizePrices(raw);
  return parsed ? JSON.stringify(parsed) : null;
}

function mapOffer(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    code: row.code,
    status: row.status,
    ends: row.ends_on ?? row.ends,
    description: row.description || "",
    dealLabel: row.deal_label || "",
    terms: row.terms || "",
    href: row.href || "/pizzas",
    image: row.image_url || "",
    showOnHome: row.show_on_home !== 0 && row.show_on_home !== false,
    menuItemId: row.menu_item_id || "",
    sizePrices: parseOfferSizePrices(row.size_prices),
    createdAt: row.created_at || null,
  };
}

const OFFER_SELECT = `id, title, code, status, ends_on, description,
  deal_label, terms, href, image_url, show_on_home, menu_item_id, size_prices, created_at`;

router.get("/", async (req, res) => {
  try {
    const homeOnly = String(req.query.home || "") === "1";
    const rows = await query(
      homeOnly
        ? `SELECT ${OFFER_SELECT}
           FROM offers
           WHERE status IN ('Active', 'Scheduled') AND show_on_home = 1
           ORDER BY status, title
           LIMIT 6`
        : `SELECT ${OFFER_SELECT}
           FROM offers
           WHERE status IN ('Active', 'Scheduled')
           ORDER BY status, title`,
    );
    res.json({ offers: rows.map(mapOffer) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/all", adminRequired, async (_req, res) => {
  try {
    const rows = await query(
      `SELECT ${OFFER_SELECT} FROM offers ORDER BY created_at DESC`,
    );
    res.json({ offers: rows.map(mapOffer) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", adminRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT ${OFFER_SELECT} FROM offers WHERE id = ?`,
      [req.params.id],
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Offer not found." });
    }
    res.json({ offer: mapOffer(rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", adminRequired, async (req, res) => {
  try {
    const {
      id,
      title,
      code,
      status = "Active",
      ends,
      description,
      dealLabel,
      terms,
      href,
      image,
      showOnHome = true,
      menuItemId,
      sizePrices,
    } = req.body || {};

    if (!title?.trim() || !code?.trim() || !ends?.trim()) {
      return res
        .status(400)
        .json({ error: "Title, promo code, and end date are required." });
    }
    if (!STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const offerId = (id?.trim() || slugifyOfferId(title)).slice(0, 40);
    const offerCode = String(code).trim().toUpperCase();

    const existingCode = await query(`SELECT id FROM offers WHERE code = ?`, [
      offerCode,
    ]);
    if (existingCode.length) {
      return res
        .status(400)
        .json({ error: "That promo code is already used. Choose another." });
    }

    const existingId = await query(`SELECT id FROM offers WHERE id = ?`, [
      offerId,
    ]);
    if (existingId.length) {
      return res.status(400).json({ error: "That offer id already exists." });
    }

    await query(
      `INSERT INTO offers
        (id, title, code, status, ends_on, description, deal_label, terms, href, image_url, show_on_home, menu_item_id, size_prices)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        offerId,
        title.trim(),
        offerCode,
        status,
        ends.trim(),
        description?.trim() || null,
        dealLabel?.trim() || null,
        terms?.trim() || null,
        normalizeHref(href),
        image?.trim() || null,
        normalizeShowOnHome(showOnHome),
        menuItemId?.trim() || null,
        serializeOfferSizePrices(sizePrices),
      ],
    );

    const rows = await query(
      `SELECT ${OFFER_SELECT} FROM offers WHERE id = ?`,
      [offerId],
    );
    res.status(201).json({ ok: true, offer: mapOffer(rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", adminRequired, async (req, res) => {
  try {
    const current = await query(`SELECT * FROM offers WHERE id = ?`, [
      req.params.id,
    ]);
    if (!current.length) {
      return res.status(404).json({ error: "Offer not found." });
    }

    const body = req.body || {};
    if (body.status !== undefined && !STATUSES.has(body.status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    if (body.code !== undefined) {
      const offerCode = String(body.code).trim().toUpperCase();
      const clash = await query(
        `SELECT id FROM offers WHERE code = ? AND id != ?`,
        [offerCode, req.params.id],
      );
      if (clash.length) {
        return res
          .status(400)
          .json({ error: "That promo code is already used. Choose another." });
      }
      body.code = offerCode;
    }

    const fieldMap = {
      title: "title",
      code: "code",
      status: "status",
      description: "description",
      dealLabel: "deal_label",
      terms: "terms",
      image: "image_url",
    };

    const updates = [];
    const params = [];
    for (const [key, column] of Object.entries(fieldMap)) {
      if (body[key] !== undefined) {
        updates.push(`${column} = ?`);
        params.push(
          typeof body[key] === "string" ? body[key].trim() : body[key],
        );
      }
    }
    if (body.ends !== undefined) {
      updates.push(`ends_on = ?`);
      params.push(String(body.ends).trim());
    }
    if (body.href !== undefined) {
      updates.push(`href = ?`);
      params.push(normalizeHref(body.href));
    }
    if (body.showOnHome !== undefined) {
      updates.push(`show_on_home = ?`);
      params.push(normalizeShowOnHome(body.showOnHome));
    }
    if (body.menuItemId !== undefined) {
      updates.push(`menu_item_id = ?`);
      params.push(body.menuItemId?.trim() || null);
    }
    if (body.sizePrices !== undefined) {
      updates.push(`size_prices = ?`);
      params.push(serializeOfferSizePrices(body.sizePrices));
    }
    if (!updates.length) {
      return res.status(400).json({ error: "No fields to update." });
    }
    params.push(req.params.id);
    await query(`UPDATE offers SET ${updates.join(", ")} WHERE id = ?`, params);

    const rows = await query(
      `SELECT ${OFFER_SELECT} FROM offers WHERE id = ?`,
      [req.params.id],
    );
    res.json({ ok: true, offer: mapOffer(rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", adminRequired, async (req, res) => {
  try {
    const existing = await query(`SELECT id FROM offers WHERE id = ?`, [
      req.params.id,
    ]);
    if (!existing.length) {
      return res.status(404).json({ error: "Offer not found." });
    }
    await query(`DELETE FROM offers WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
