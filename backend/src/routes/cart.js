import { Router } from "express";
import { query } from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

router.get("/", authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT c.id, c.item_id, c.quantity, m.name, m.price, m.image
       FROM cart_items c
       JOIN menu_items m ON m.id = c.item_id
       WHERE c.user_id = ?
       ORDER BY c.updated_at DESC`,
      [req.user.id],
    );
    const items = rows.map((r) => ({
      id: r.item_id,
      cartId: r.id,
      name: r.name,
      price: Number(r.price),
      qty: r.quantity,
      image: r.image,
    }));
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    res.json({ items, subtotal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", authRequired, async (req, res) => {
  try {
    const { itemId, quantity = 1 } = req.body || {};
    if (!itemId) return res.status(400).json({ error: "itemId is required." });

    const menu = await query(
      `SELECT id FROM menu_items WHERE id = ? AND active = 1`,
      [itemId],
    );
    if (!menu.length) return res.status(404).json({ error: "Item not found." });

    await query(
      `INSERT INTO cart_items (user_id, item_id, quantity)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
      [req.user.id, itemId, Math.max(1, Number(quantity) || 1)],
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:itemId", authRequired, async (req, res) => {
  try {
    const qty = Number(req.body?.quantity);
    if (!Number.isFinite(qty)) {
      return res.status(400).json({ error: "quantity is required." });
    }
    if (qty <= 0) {
      await query(`DELETE FROM cart_items WHERE user_id = ? AND item_id = ?`, [
        req.user.id,
        req.params.itemId,
      ]);
    } else {
      await query(
        `UPDATE cart_items SET quantity = ? WHERE user_id = ? AND item_id = ?`,
        [qty, req.user.id, req.params.itemId],
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:itemId", authRequired, async (req, res) => {
  try {
    await query(`DELETE FROM cart_items WHERE user_id = ? AND item_id = ?`, [
      req.user.id,
      req.params.itemId,
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
