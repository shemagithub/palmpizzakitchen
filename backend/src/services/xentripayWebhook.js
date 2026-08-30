import { query } from "../db.js";
import {
  getXentriPayConfig,
  mapPayoutStatusToInternal,
  verifyXentriPayWebhookSignature,
} from "./xentriPayService.js";
import {
  findPaymentTransactionByRefs,
  markOrderFailed,
  markOrderPaid,
} from "./orderPayment.js";

const PAID_EVENTS = new Set([
  "COLLECTION_SUCCESSFUL",
  "CHECKOUT_SUCCESSFUL",
  "PAYMENTREQUESTCOMPLETED",
  "PAYMENT_REQUEST_COMPLETED",
  "PAYMENTLINKCONTRIBUTION_SUCCESSFUL",
]);

const FAILED_EVENTS = new Set([
  "COLLECTION_FAILED",
  "CHECKOUT_FAILED",
  "PAYMENTREQUESTFAILED",
  "PAYMENT_REQUEST_FAILED",
  "PAYMENTLINKCONTRIBUTION_FAILED",
]);

const PAYOUT_EVENTS = new Set([
  "PAYOUT_SUCCESS",
  "PAYOUT_FAILED",
  "PAYOUT_REVERSED",
  "PAYOUT_CREATED",
  "PAYOUT_CONFIRMED",
]);

function collectRefs(data = {}) {
  return [
    data.reference,
    data.customerRef,
    data.customerReference,
    data.refid,
    data.rid,
    data.tid,
    data.externalTransactionRef,
    data.internalRef,
  ];
}

async function alreadyProcessed(idempotencyKey) {
  if (!idempotencyKey) return false;
  const rows = await query(
    `SELECT idempotency_key FROM webhook_deliveries WHERE idempotency_key = ? LIMIT 1`,
    [idempotencyKey],
  );
  return rows.length > 0;
}

async function rememberDelivery(idempotencyKey, eventType) {
  if (!idempotencyKey) return;
  await query(
    `INSERT IGNORE INTO webhook_deliveries (idempotency_key, event_type) VALUES (?, ?)`,
    [idempotencyKey, eventType || ""],
  );
}

async function applyCollectionEvent(event, data) {
  const tx = await findPaymentTransactionByRefs(collectRefs(data));
  if (!tx) {
    console.warn("XentriPay webhook: no matching payment for", event, collectRefs(data));
    return;
  }
  if (PAID_EVENTS.has(event)) {
    await markOrderPaid(tx.order_id, tx, data);
    return;
  }
  if (FAILED_EVENTS.has(event)) {
    await markOrderFailed(tx.order_id, tx, data);
  }
}

async function applyPayoutEvent(event, data) {
  const refs = collectRefs(data).filter(Boolean);
  if (!refs.length) return;
  let payout = null;
  for (const ref of refs) {
    const rows = await query(
      `SELECT * FROM payouts WHERE customer_reference = ? OR internal_ref = ? LIMIT 1`,
      [String(ref), String(ref)],
    );
    if (rows.length) {
      payout = rows[0];
      break;
    }
  }
  if (!payout) return;
  const status = mapPayoutStatusToInternal(
    data.status || (event.includes("FAIL") ? "FAILED" : event.includes("SUCCESS") ? "SUCCESS" : "PENDING"),
  );
  await query(
    `UPDATE payouts SET status = ?, status_message = ?, gateway_payload = ? WHERE id = ?`,
    [status, event, JSON.stringify(data), payout.id],
  );
}

export async function handleXentriPayWebhook(req, res) {
  const config = getXentriPayConfig();
  const signature =
    req.headers["x-xentripay-signature"] || req.headers["x-xentripay-signature".toLowerCase()];
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}), "utf8");

  if (!config.webhookSecret) {
    return res.status(503).json({ error: "Webhook secret is not configured." });
  }
  if (!verifyXentriPayWebhookSignature(rawBody, signature, config.webhookSecret)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const event = String(
    payload.event || req.headers["x-xentripay-event"] || "",
  ).toUpperCase();
  const idempotencyKey =
    payload.idempotencyKey ||
    req.headers["x-xentripay-idempotency-key"] ||
    "";

  res.status(200).json({ received: true });

  if (await alreadyProcessed(idempotencyKey)) {
    return;
  }

  try {
    const data = payload.data || payload;
    if (PAID_EVENTS.has(event) || FAILED_EVENTS.has(event)) {
      await applyCollectionEvent(event, data);
    }
    if (PAYOUT_EVENTS.has(event) || event.startsWith("PAYOUT")) {
      await applyPayoutEvent(event, data);
    }
    await rememberDelivery(idempotencyKey, event);
  } catch (error) {
    console.error("XentriPay webhook processing failed:", error.message);
  }
}
