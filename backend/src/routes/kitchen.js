import { Router } from "express";
import { query } from "../db.js";

const router = Router();

function extractArea(order) {
  const notes = String(order.notes || "");
  for (const part of notes.split("|")) {
    const trimmed = part.trim();
    if (trimmed.startsWith("area:")) {
      return trimmed.slice(5).trim();
    }
  }
  const address = String(order.address || "");
  const match = address.match(
    /\b(Remera|Kimironko|Kacyiru|Nyarutarama|Gisozi|Kimihurura|Nyamirambo|Kicukiro|Gikondo|Kanombe|Gaculiro|Downtown|CBD|[A-Za-z ]+)\b/i,
  );
  if (match?.[1]) {
    const value = match[1].trim();
    if (value.length > 2 && value.length < 40) return value;
  }
  return "Kigali";
}

function shortenItemName(name) {
  const clean = String(name || "Pizza").replace(/\s*\([^)]*\)/g, "").trim();
  const words = clean.split(/\s+/).slice(0, 3);
  return words.join(" ") || "Pizza";
}

function minutesAgo(value) {
  const at = new Date(value).getTime();
  if (!Number.isFinite(at)) return null;
  return Math.max(1, Math.round((Date.now() - at) / 60000));
}

router.get("/pulse", async (_req, res) => {
  try {
    const rows = await query(
      `SELECT o.id, o.customer_name, o.address, o.notes, o.paid_at, o.created_at,
              MIN(oi.name) AS item_name
       FROM orders o
       INNER JOIN order_items oi ON oi.order_id = o.id
       WHERE o.payment_status = 'paid'
       GROUP BY o.id, o.customer_name, o.address, o.notes, o.paid_at, o.created_at
       ORDER BY COALESCE(o.paid_at, o.created_at) DESC
       LIMIT 15`,
    );

    const pulses = rows.map((row) => {
      const when = row.paid_at || row.created_at;
      const firstName = String(row.customer_name || "Someone")
        .trim()
        .split(/\s+/)[0];
      return {
        id: row.id,
        firstName: firstName.slice(0, 12) || "Someone",
        area: extractArea(row),
        item: shortenItemName(row.item_name),
        minutesAgo: minutesAgo(when),
      };
    });

    res.json({
      ok: true,
      live: pulses.length > 0,
      count: pulses.length,
      pulses,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, pulses: [] });
  }
});

export default router;
