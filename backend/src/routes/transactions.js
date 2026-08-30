import { Router } from "express";
import { query } from "../db.js";
import { adminRequired } from "../middleware/auth.js";
import { paymentMethodLabel } from "../services/orderPayment.js";
import { TELECOM_PROVIDER_IDS } from "../services/xentriPayService.js";

const router = Router();

function providerLabel(id) {
  const value = String(id || "");
  if (value === TELECOM_PROVIDER_IDS.mtn || value === "mtn_momo" || value === "momo") {
    return "MTN MoMo";
  }
  if (value === TELECOM_PROVIDER_IDS.airtel || value === "airtel_money" || value === "airtel") {
    return "Airtel Money";
  }
  if (value === "cc" || value === "card") return "Card";
  return paymentMethodLabel(value);
}

function moneyStatusLabel(status, direction) {
  const s = String(status || "pending").toLowerCase();
  if (direction === "out") {
    if (["completed", "success", "successful"].includes(s)) return "Sent";
    if (s === "failed") return "Failed";
    return "Pending";
  }
  if (s === "paid") return "Paid in";
  if (s === "failed") return "Failed";
  return "Awaiting";
}

router.get("/", adminRequired, async (req, res) => {
  try {
    const type = String(req.query.type || "all").toLowerCase();
    const status = String(req.query.status || "all").toLowerCase();
    const q = String(req.query.q || "").trim();

    const incoming = await query(
      `SELECT
          t.id,
          t.order_id,
          t.customer_reference,
          t.gateway_refid,
          t.gateway_tid,
          t.amount,
          t.currency,
          t.pmethod,
          t.status,
          t.created_at,
          t.updated_at,
          o.customer_name,
          o.phone,
          o.customer_email,
          o.payment_method
       FROM payment_transactions t
       LEFT JOIN orders o ON o.id = t.order_id
       ORDER BY t.created_at DESC
       LIMIT 200`,
    );

    const outgoing = await query(
      `SELECT
          id,
          customer_reference,
          internal_ref,
          amount,
          currency,
          recipient_name,
          msisdn,
          telecom_provider_id,
          status,
          status_message,
          created_at,
          updated_at
       FROM payouts
       ORDER BY created_at DESC
       LIMIT 200`,
    );

    const rows = [
      ...incoming.map((row) => ({
        id: `in-${row.id}`,
        direction: "in",
        relatedId: row.order_id,
        reference: row.customer_reference,
        gatewayRef: row.gateway_refid || row.gateway_tid || "",
        amount: Number(row.amount),
        currency: row.currency || "RWF",
        method: providerLabel(row.pmethod || row.payment_method),
        status: row.status || "pending",
        statusLabel: moneyStatusLabel(row.status, "in"),
        party: row.customer_name || "Customer",
        phone: row.phone || "",
        email: row.customer_email || "",
        note: "",
        createdAt: row.created_at,
      })),
      ...outgoing.map((row) => ({
        id: `out-${row.id}`,
        direction: "out",
        relatedId: row.customer_reference,
        reference: row.customer_reference,
        gatewayRef: row.internal_ref || "",
        amount: Number(row.amount),
        currency: row.currency || "RWF",
        method: providerLabel(row.telecom_provider_id),
        status: row.status || "pending",
        statusLabel: moneyStatusLabel(row.status, "out"),
        party: row.recipient_name || "Recipient",
        phone: row.msisdn || "",
        email: "",
        note: row.status_message || "",
        createdAt: row.created_at,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const filtered = rows.filter((row) => {
      if (type === "in" && row.direction !== "in") return false;
      if (type === "out" && row.direction !== "out") return false;
      if (status === "paid") {
        const ok =
          row.direction === "in"
            ? row.status === "paid"
            : ["completed", "success", "successful"].includes(row.status);
        if (!ok) return false;
      }
      if (status === "pending") {
        const pending =
          row.status === "pending" ||
          row.status === "unpaid" ||
          row.status === "";
        if (!pending) return false;
      }
      if (status === "failed" && row.status !== "failed") return false;
      if (q) {
        const blob = [
          row.relatedId,
          row.reference,
          row.gatewayRef,
          row.party,
          row.phone,
          row.email,
        ]
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q.toLowerCase())) return false;
      }
      return true;
    });

    const paidIn = rows
      .filter((row) => row.direction === "in" && row.status === "paid")
      .reduce((sum, row) => sum + row.amount, 0);
    const paidOut = rows
      .filter(
        (row) =>
          row.direction === "out" &&
          ["completed", "success", "successful"].includes(row.status),
      )
      .reduce((sum, row) => sum + row.amount, 0);
    const awaiting = rows.filter(
      (row) =>
        row.status === "pending" ||
        row.status === "unpaid" ||
        row.status === "",
    ).length;

    res.json({
      summary: {
        paidIn,
        paidOut,
        awaiting,
        count: rows.length,
      },
      transactions: filtered.slice(0, 150),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
