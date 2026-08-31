import { Router } from "express";
import { query } from "../db.js";
import { adminRequired, authRequired, optionalAuth } from "../middleware/auth.js";
import {
  initiateOrderPayment,
  loadOrderBundle,
  paymentMethodLabel,
  syncOrderPayment,
} from "../services/orderPayment.js";
import { notifyCustomerOrderStatus } from "../services/orderStatusNotify.js";
import {
  extractAreaFromOrderInput,
  resolveDeliveryFee,
} from "../services/deliveryFees.js";
import {
  loadActiveOffer,
  resolveOfferBundleLine,
} from "../services/offerPricing.js";

function asSize(value) {
  const raw = String(value || "").toLowerCase();
  if (raw === "s" || raw === "small") return "s";
  if (raw === "m" || raw === "medium") return "m";
  if (raw === "l" || raw === "large") return "l";
  return "";
}

function sizeWord(id) {
  return id === "s" ? "Small" : id === "l" ? "Large" : "Medium";
}

function sizesFromDetails(raw) {
  if (!raw) return null;
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const sizes = parsed?.sizes;
  if (
    !sizes ||
    !(
      sizes.enabled === true ||
      sizes.enabled === 1 ||
      sizes.enabled === "1" ||
      sizes.enabled === "true"
    )
  ) {
    return null;
  }
  const money = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const s = money(sizes.s);
  const m = money(sizes.m);
  const l = money(sizes.l);
  if (s == null && m == null && l == null) return null;
  return {
    ...(s != null ? { s } : {}),
    ...(m != null ? { m } : {}),
    ...(l != null ? { l } : {}),
  };
}

function resolveMenuItemId(rawId) {
  const value = String(rawId || "").trim();
  const split = value.split("::");
  if (split.length === 2 && asSize(split[1])) {
    return { id: split[0], size: asSize(split[1]) };
  }
  return { id: value, size: "" };
}

function parseDetailsObject(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function comboSlotsFromDetails(raw) {
  const parsed = parseDetailsObject(raw);
  const slots = Array.isArray(parsed?.comboSlots) ? parsed.comboSlots : [];
  return slots
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const id = String(row.id || "").trim();
      const label = String(row.label || "").trim();
      const categories = (
        Array.isArray(row.categories) ? row.categories : []
      ).map((c) => String(c).trim().toLowerCase());
      const itemIds = Array.isArray(row.itemIds)
        ? row.itemIds.map((x) => String(x).trim()).filter(Boolean)
        : [];
      if (!id || !label) return null;
      return { id, label, categories, itemIds };
    })
    .filter(Boolean);
}

function normalizeComboChoices(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const slotId = String(row.slotId || "").trim();
      const itemId = String(row.itemId || "").trim();
      const itemName = String(row.itemName || "").trim();
      if (!slotId || !itemId) return null;
      return { slotId, itemId, itemName };
    })
    .filter(Boolean);
}

async function resolveComboLineName(baseName, detailsRaw, choicesInput) {
  const slots = comboSlotsFromDetails(detailsRaw);
  if (!slots.length) return baseName;
  const choices = normalizeComboChoices(choicesInput);
  if (choices.length !== slots.length) {
    return { error: `Please select every option for ${baseName}.` };
  }
  const bySlot = new Map(choices.map((c) => [c.slotId, c]));
  const labels = [];
  for (const slot of slots) {
    const pick = bySlot.get(slot.id);
    if (!pick) {
      return { error: `Missing choice for “${slot.label}” in ${baseName}.` };
    }
    const rows = await query(
      `SELECT id, name, category FROM menu_items WHERE id = ? AND active = 1`,
      [pick.itemId],
    );
    if (!rows.length) {
      return { error: `Unknown combo choice: ${pick.itemId}` };
    }
    const cat = String(rows[0].category || "");
    if (slot.categories.length && !slot.categories.includes(cat)) {
      return {
        error: `${rows[0].name} is not allowed for “${slot.label}”.`,
      };
    }
    if (slot.itemIds.length && !slot.itemIds.includes(rows[0].id)) {
      return {
        error: `${rows[0].name} is not allowed for “${slot.label}”.`,
      };
    }
    labels.push(rows[0].name);
  }
  return { name: `${baseName} (${labels.join(" · ")})` };
}

function nextOrderId() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${n}`;
}

async function loadOrderPolicy() {
  const rows = await query(
    `SELECT setting_key, setting_value FROM settings
     WHERE setting_key IN ('accepting_orders', 'min_order', 'kitchen_note')`,
  );
  const map = Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value]));
  return {
    accepting: map.accepting_orders !== "0",
    minOrder: Math.max(0, Math.round(Number(map.min_order) || 0)),
    kitchenNote: String(map.kitchen_note || "").trim(),
  };
}

function orderPolicyError(policy, subtotal) {
  if (!policy.accepting) {
    return (
      policy.kitchenNote ||
      "Kitchen is not accepting orders right now."
    );
  }
  if (policy.minOrder > 0 && subtotal < policy.minOrder) {
    return `Minimum order is ${policy.minOrder.toLocaleString("en-RW")} RWF.`;
  }
  return "";
}

const router = Router();

router.get("/delivery-fee", async (req, res) => {
  try {
    const area = String(req.query.area || "").trim();
    const fee = area ? await resolveDeliveryFee(area) : 0;
    res.json({ area: area || null, fee });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/mine", optionalAuth, async (req, res) => {
  try {
    const ids = String(req.query.ids || "")
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter((id) => /^ORD-\d{4}$/.test(id))
      .slice(0, 25);

    const clauses = [];
    const params = [];
    if (req.user?.id) {
      clauses.push("user_id = ?");
      params.push(req.user.id);
    }
    if (req.user?.email) {
      clauses.push("LOWER(customer_email) = ?");
      params.push(String(req.user.email).trim().toLowerCase());
    }
    if (ids.length) {
      clauses.push(`id IN (${ids.map(() => "?").join(",")})`);
      params.push(...ids);
    }
    if (!clauses.length) {
      return res.json({ orders: [] });
    }

    const whereSql = clauses.join(" OR ");
    let orders = await query(
      `SELECT * FROM orders WHERE ${whereSql} ORDER BY created_at DESC LIMIT 40`,
      params,
    );

    const pending = orders
      .filter((order) => (order.payment_status || "pending") === "pending")
      .slice(0, 6);
    if (pending.length) {
      await Promise.all(
        pending.map((order) =>
          syncOrderPayment(order.id).catch(() => null),
        ),
      );
      orders = await query(
        `SELECT * FROM orders WHERE ${whereSql} ORDER BY created_at DESC LIMIT 40`,
        params,
      );
    }

    const result = [];
    for (const order of orders) {
      result.push(await serializeCustomerOrder(order));
    }
    res.json({ orders: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/lookup", async (req, res) => {
  try {
    const orderId = String(req.body?.orderId || "").trim().toUpperCase();
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!/^ORD-\d{4}$/.test(orderId) || !email.includes("@")) {
      return res.status(400).json({
        error: "Enter your order number (ORD-1234) and the email used at checkout.",
      });
    }
    const rows = await query(
      `SELECT * FROM orders WHERE id = ? AND LOWER(customer_email) = ? LIMIT 1`,
      [orderId, email],
    );
    if (!rows.length) {
      return res.status(404).json({ error: "No order matched that number and email." });
    }
    if ((rows[0].payment_status || "pending") === "pending") {
      await syncOrderPayment(rows[0].id).catch(() => null);
    }
    const fresh = await query(`SELECT * FROM orders WHERE id = ? LIMIT 1`, [orderId]);
    res.json({ order: await serializeCustomerOrder(fresh[0] || rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function parseOrderNotes(notes) {
  const raw = String(notes || "");
  const parts = raw
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);
  const meta = {
    paymentHint: "",
    area: "",
    landmark: "",
    place: "",
    gps: "",
    accuracyMeters: null,
    fulfillment: "",
    extra: [],
  };
  for (const part of parts) {
    if (part.startsWith("pay:")) meta.paymentHint = part.slice(4).trim();
    else if (part.startsWith("area:")) meta.area = part.slice(5).trim();
    else if (part.startsWith("landmark:")) meta.landmark = part.slice(9).trim();
    else if (part.startsWith("place:")) meta.place = part.slice(6).trim();
    else if (part.startsWith("fulfillment:")) {
      const value = part.slice(12).trim().toLowerCase();
      meta.fulfillment = value === "pickup" ? "pickup" : "delivery";
    } else if (part.startsWith("live-gps:") || part.startsWith("gps:")) {
      const payload = part.includes("live-gps:")
        ? part.slice("live-gps:".length)
        : part.slice(4);
      const [coordsPart, accPart] = payload.split("|acc:");
      meta.gps = coordsPart.trim();
      if (accPart) {
        const match = accPart.match(/(\d+)/);
        if (match) meta.accuracyMeters = Number(match[1]);
      }
    } else meta.extra.push(part);
  }
  return meta;
}

function paymentLabel(method) {
  return paymentMethodLabel(method);
}

function isPickupOrder(order) {
  return (
    String(order.notes || "").includes("fulfillment:pickup") ||
    /pickup/i.test(String(order.address || ""))
  );
}

function kitchenLabel(order) {
  const pay = String(order.payment_status || "pending");
  const status = order.status || "Pending";
  const pickup = isPickupOrder(order);

  if (status === "Cancelled") return "Cancelled";
  if (pay === "failed") return "Not sent to kitchen - payment failed";
  if (pay !== "paid") return "On hold until payment is confirmed";
  if (status === "Pending") {
    return pickup ? "Paid · queued for pickup" : "Paid · in the kitchen queue";
  }
  if (status === "Preparing") {
    return pickup ? "Kitchen is preparing for pickup" : "Kitchen is preparing";
  }
  if (status === "Out for delivery") {
    return pickup ? "Ready for pickup" : "Out for delivery";
  }
  if (status === "Delivered") return pickup ? "Collected" : "Delivered";
  return status;
}

async function serializeCustomerOrder(order) {
  const items = await query(
    `SELECT name, unit_price, quantity FROM order_items WHERE order_id = ?`,
    [order.id],
  );
  const pickup = isPickupOrder(order);
  return {
    id: order.id,
    items: items.map((i) => `${i.name} ×${i.quantity}`).join(", "),
    lineItems: items.map((i) => ({
      name: i.name,
      unitPrice: Number(i.unit_price),
      quantity: i.quantity,
    })),
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.delivery_fee),
    status: order.status,
    kitchenLabel: kitchenLabel(order),
    paymentStatus: order.payment_status || "pending",
    paymentLabel: paymentLabel(order.payment_method),
    paidAt: order.paid_at || null,
    fulfillment: pickup ? "pickup" : "delivery",
    address: order.address,
    createdAt: order.created_at,
  };
}

async function buildOrderDetail(order) {
  const items = await query(
    `SELECT item_id, name, unit_price, quantity
     FROM order_items WHERE order_id = ?`,
    [order.id],
  );

  let account = null;
  if (order.user_id) {
    const users = await query(
      `SELECT id, name, email, phone, role, created_at
       FROM users WHERE id = ?`,
      [order.user_id],
    );
    if (users.length) {
      const u = users[0];
      account = {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || "",
        role: u.role,
        memberSince: u.created_at,
      };
    }
  }

  const lineItems = items.map((i) => ({
    itemId: i.item_id,
    name: i.name,
    unitPrice: Number(i.unit_price),
    quantity: i.quantity,
    lineTotal: Number(i.unit_price) * i.quantity,
  }));

  const notesMeta = parseOrderNotes(order.notes);

  return {
    id: order.id,
    customer: order.customer_name,
    phone: order.phone,
    address: order.address,
    paymentMethod: order.payment_method,
    paymentLabel: paymentLabel(order.payment_method),
    paymentStatus: order.payment_status || "pending",
    paidAt: order.paid_at || null,
    email: order.customer_email || "",
    status: order.status,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.delivery_fee),
    total: Number(order.total),
    notes: order.notes || "",
    notesMeta,
    time: order.created_at,
    updatedAt: order.updated_at,
    userId: order.user_id,
    account,
    guestCheckout: !order.user_id,
    items: lineItems.map((i) => `${i.name} ×${i.quantity}`).join(", "),
    lineItems,
    kitchenLabel: kitchenLabel(order),
    fulfillment: isPickupOrder(order) ? "pickup" : "delivery",
  };
}

router.get("/", adminRequired, async (req, res) => {
  try {
    const { status, q, payment } = req.query;
    let sql = `SELECT * FROM orders WHERE 1=1`;
    const params = [];
    if (status && status !== "All") {
      sql += ` AND status = ?`;
      params.push(status);
    }
    const payFilter = String(payment || "").toLowerCase();
    if (payFilter === "paid") {
      sql += ` AND payment_status = 'paid'`;
    } else if (payFilter === "failed") {
      sql += ` AND payment_status = 'failed'`;
    } else if (payFilter === "pending") {
      sql += ` AND (payment_status IS NULL OR payment_status IN ('pending', 'unpaid'))`;
    }
    if (q) {
      sql += ` AND (id LIKE ? OR customer_name LIKE ? OR phone LIKE ? OR customer_email LIKE ?)`;
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    sql += ` ORDER BY created_at DESC LIMIT 100`;

    let orders = await query(sql, params);
    const pending = orders
      .filter((order) => (order.payment_status || "pending") === "pending")
      .slice(0, 8);
    if (pending.length) {
      await Promise.all(
        pending.map((order) => syncOrderPayment(order.id).catch(() => null)),
      );
      orders = await query(sql, params);
    }

    const result = [];
    for (const order of orders) {
      const items = await query(
        `SELECT name, unit_price, quantity FROM order_items WHERE order_id = ?`,
        [order.id],
      );
      result.push({
        id: order.id,
        customer: order.customer_name,
        email: order.customer_email || "",
        phone: order.phone,
        address: order.address,
        paymentMethod: order.payment_method,
        paymentLabel: paymentLabel(order.payment_method),
        paymentStatus: order.payment_status || "pending",
        paidAt: order.paid_at || null,
        status: order.status,
        kitchenLabel: kitchenLabel(order),
        fulfillment: isPickupOrder(order) ? "pickup" : "delivery",
        notesMeta: parseOrderNotes(order.notes),
        notes: order.notes || "",
        total: Number(order.total),
        time: order.created_at,
        items: items
          .map((i) => `${i.name} ×${i.quantity}`)
          .join(", "),
        lineItems: items.map((i) => ({
          name: i.name,
          unitPrice: Number(i.unit_price),
          quantity: i.quantity,
        })),
      });
    }
    res.json({ orders: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/retry-payment", optionalAuth, async (req, res) => {
  try {
    const orderId = String(req.params.id || "").trim();
    const email = String(req.body?.email || req.user?.email || "")
      .trim()
      .toLowerCase();
    const payerPhone = String(req.body?.payerPhone || req.body?.phone || "").trim();

    const rows = await query(`SELECT * FROM orders WHERE id = ? LIMIT 1`, [
      orderId,
    ]);
    if (!rows.length) {
      return res.status(404).json({ error: "Order not found." });
    }
    const order = rows[0];

    const ownsOrder =
      (req.user?.id && Number(order.user_id) === Number(req.user.id)) ||
      (email &&
        String(order.customer_email || "").trim().toLowerCase() === email);
    if (!ownsOrder) {
      return res.status(403).json({
        error: "Enter the same email used at checkout to retry payment.",
      });
    }

    if (order.payment_status === "paid") {
      return res.status(400).json({ error: "This order is already paid." });
    }

    const policy = await loadOrderPolicy();
    if (!policy.accepting) {
      return res.status(403).json({
        error: policy.kitchenNote || "Kitchen is not accepting orders right now.",
      });
    }

    const bundle = await loadOrderBundle(orderId);
    if (!bundle) {
      return res.status(404).json({ error: "Order not found." });
    }

    const started = await initiateOrderPayment({
      order,
      items: bundle.items,
      email: order.customer_email || email,
      phone: payerPhone || order.phone,
      paymentMethod: order.payment_method === "card" ? "card" : "momo",
    });

    res.json({
      ok: true,
      order: {
        id: orderId,
        total: Number(order.total),
        paymentStatus: "pending",
      },
      payment: started.payment,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get("/:id", adminRequired, async (req, res) => {
  try {
    await syncOrderPayment(req.params.id).catch(() => null);
    const rows = await query(`SELECT * FROM orders WHERE id = ?`, [
      req.params.id,
    ]);
    if (!rows.length) {
      return res.status(404).json({ error: "Order not found." });
    }
    const order = await buildOrderDetail(rows[0]);
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", optionalAuth, async (req, res) => {
  try {
    const {
      customerName,
      phone,
      email,
      address,
      paymentMethod = "mtn_momo",
      items,
      notes,
      payerPhone,
      fulfillment: fulfillmentRaw,
      area: areaRaw,
    } = req.body || {};

    const fulfillment =
      String(fulfillmentRaw || "delivery").toLowerCase() === "pickup"
        ? "pickup"
        : "delivery";

    const deliveryArea = extractAreaFromOrderInput(
      { area: areaRaw },
      notes,
    );

    if (!customerName?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: "Name and phone are required." });
    }
    const deliveryAddress =
      fulfillment === "pickup"
        ? String(address || "").trim() || "Pickup at Palm Pizza Kitchen"
        : String(address || "").trim();
    if (fulfillment === "delivery" && !deliveryAddress) {
      return res.status(400).json({ error: "Delivery address is required." });
    }
    if (fulfillment === "delivery" && !deliveryArea) {
      return res.status(400).json({
        error: "Select your delivery area so we can calculate the delivery fee.",
      });
    }
    const customerEmail = String(email || req.user?.email || "").trim().toLowerCase();
    if (!customerEmail || !customerEmail.includes("@")) {
      return res.status(400).json({
        error: "A valid email is required so we can send your receipt.",
      });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order items are required." });
    }

    const allowedPay = new Set([
      "card",
      "airtel_money",
      "mtn_momo",
      "cash",
      "momo",
      "airtel",
    ]);
    const pay = String(paymentMethod || "mtn_momo");
    if (!allowedPay.has(pay)) {
      return res.status(400).json({ error: "Unsupported payment method." });
    }

    const policy = await loadOrderPolicy();
    if (!policy.accepting) {
      return res.status(403).json({
        error: policy.kitchenNote || "Kitchen is not accepting orders right now.",
      });
    }

    let subtotal = 0;
    const lineItems = [];
    const promoCodes = new Set();
    for (const line of items) {
      const bundle = line.offerBundle;
      if (bundle?.offerId) {
        const loaded = await loadActiveOffer(String(bundle.offerId));
        if (loaded.error) {
          return res.status(400).json({ error: loaded.error });
        }
        const paidId = String(bundle.paidItemId || line.itemId || "").trim();
        const freeId = String(bundle.freeItemId || "").trim();
        const paidRows = paidId
          ? await query(
              `SELECT id, name, price, details, category FROM menu_items WHERE id = ? AND active = 1`,
              [paidId],
            )
          : [];
        const freeRows = freeId
          ? await query(
              `SELECT id, name, price, details, category FROM menu_items WHERE id = ? AND active = 1`,
              [freeId],
            )
          : [];
        const resolved = resolveOfferBundleLine(
          loaded.offer,
          paidRows[0],
          freeRows[0],
          bundle,
        );
        if (resolved.error) {
          return res.status(400).json({ error: resolved.error });
        }
        const qty = Math.max(1, Number(line.quantity) || 1);
        subtotal += resolved.unitPrice * qty;
        if (resolved.offerCode) promoCodes.add(resolved.offerCode);
        lineItems.push({
          itemId: resolved.itemId,
          name: resolved.name,
          unitPrice: resolved.unitPrice,
          quantity: qty,
        });
        continue;
      }

      const parsed = resolveMenuItemId(line.itemId);
      let size = asSize(line.size) || parsed.size;
      const rows = await query(
        `SELECT id, name, price, details, category FROM menu_items WHERE id = ? AND active = 1`,
        [parsed.id],
      );
      if (!rows.length) {
        return res.status(400).json({ error: `Unknown item: ${line.itemId}` });
      }
      const qty = Math.max(1, Number(line.quantity) || 1);
      const sizePrices = sizesFromDetails(rows[0].details);
      if (size && !sizePrices) {
        size = "";
      }
      if (sizePrices && (!size || sizePrices[size] == null)) {
        size =
          sizePrices.m != null
            ? "m"
            : sizePrices.s != null
              ? "s"
              : sizePrices.l != null
                ? "l"
                : "";
      }
      const unit =
        size && sizePrices && sizePrices[size] != null
          ? sizePrices[size]
          : Number(rows[0].price);
      subtotal += unit * qty;
      let lineName = size
        ? `${rows[0].name} (${sizeWord(size)})`
        : rows[0].name;
      if (String(rows[0].category || "") === "combo") {
        const resolved = await resolveComboLineName(
          lineName,
          rows[0].details,
          line.comboChoices,
        );
        if (resolved?.error) {
          return res.status(400).json({ error: resolved.error });
        }
        if (resolved?.name) lineName = resolved.name;
      }
      lineItems.push({
        itemId: rows[0].id,
        name: lineName,
        unitPrice: unit,
        quantity: qty,
      });
    }

    const policyError = orderPolicyError(policy, subtotal);
    if (policyError) {
      return res.status(400).json({ error: policyError });
    }

    const deliveryFee =
      fulfillment === "pickup" ? 0 : await resolveDeliveryFee(deliveryArea);
    const total = Number((subtotal + deliveryFee).toFixed(2));
    const orderId = nextOrderId();
    const userId = req.user?.id || null;

    const orderNotes = [
      fulfillment === "pickup" ? "fulfillment:pickup" : "fulfillment:delivery",
      promoCodes.size ? `promo:${[...promoCodes].join(",")}` : "",
      notes || "",
    ]
      .filter(Boolean)
      .join(" | ");

    await query(
      `INSERT INTO orders
        (id, user_id, customer_name, customer_email, phone, address, payment_method, status, payment_status, subtotal, delivery_fee, total, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', 'pending', ?, ?, ?, ?)`,
      [
        orderId,
        userId,
        customerName.trim(),
        customerEmail,
        phone.trim(),
        deliveryAddress,
        pay,
        subtotal,
        deliveryFee,
        total,
        orderNotes || null,
      ],
    );

    for (const line of lineItems) {
      await query(
        `INSERT INTO order_items (order_id, item_id, name, unit_price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, line.itemId, line.name, line.unitPrice, line.quantity],
      );
    }

    const order = {
      id: orderId,
      customer_name: customerName.trim(),
      customer_email: customerEmail,
      phone: phone.trim(),
      address: deliveryAddress,
      payment_method: pay,
      total,
      subtotal,
      delivery_fee: deliveryFee,
      user_id: userId,
    };

    try {
      const started = await initiateOrderPayment({
        order,
        items: lineItems,
        email: customerEmail,
        phone: payerPhone || phone,
        paymentMethod: pay === "card" ? "card" : "momo",
      });

      res.status(201).json({
        ok: true,
        order: {
          id: orderId,
          total,
          status: "Pending",
          paymentStatus: "pending",
        },
        payment: started.payment,
      });
    } catch (payErr) {
      console.error("Payment initiate failed:", payErr.message, payErr.data || "");
      await query(`DELETE FROM orders WHERE id = ?`, [orderId]);
      throw payErr;
    }
  } catch (err) {
    const status = err.status === 401 ? 502 : err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

router.patch("/:id/status", adminRequired, async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = [
      "Pending",
      "Preparing",
      "Out for delivery",
      "Delivered",
      "Cancelled",
    ];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }
    const rows = await query(
      `SELECT * FROM orders WHERE id = ? LIMIT 1`,
      [req.params.id],
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Order not found." });
    }
    const order = rows[0];
    if (
      status !== "Cancelled" &&
      status !== "Pending" &&
      order.payment_status !== "paid"
    ) {
      return res.status(400).json({
        error: "Wait until this order is paid before sending it to the kitchen.",
      });
    }

    const previousStatus = order.status;
    if (previousStatus === status) {
      return res.json({
        ok: true,
        status,
        emailNotified: false,
        message: "Status unchanged.",
      });
    }

    await query(`UPDATE orders SET status = ? WHERE id = ?`, [
      status,
      req.params.id,
    ]);

    const notify = await notifyCustomerOrderStatus(order, status);

    res.json({
      ok: true,
      status,
      previousStatus,
      emailNotified: Boolean(notify.sent),
      emailSkipped: notify.skipped || undefined,
      emailError: notify.error || undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", adminRequired, async (req, res) => {
  try {
    const rows = await query(`SELECT id FROM orders WHERE id = ?`, [
      req.params.id,
    ]);
    if (!rows.length) {
      return res.status(404).json({ error: "Order not found." });
    }
    await query(`DELETE FROM orders WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
