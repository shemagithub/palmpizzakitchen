import { Router } from "express";
import { getXentriPayConfig } from "../services/xentriPayService.js";
import { syncOrderPayment } from "../services/orderPayment.js";

const router = Router();

router.get("/config", (_req, res) => {
  const config = getXentriPayConfig();
  res.json({
    configured: config.isConfigured,
    live: Boolean(config.isLive),
    currency: "RWF",
    minAmount: 100,
  });
});

router.get("/xentripay/callback", async (req, res) => {
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const orderId = String(req.query.orderId || "");
  const reference = String(req.query.reference || req.query.refid || "");
  try {
    if (orderId) {
      await syncOrderPayment(orderId, { reference: reference || undefined });
    }
  } catch (error) {
    console.error("XentriPay callback sync failed:", error.message);
  }
  const params = new URLSearchParams();
  if (orderId) params.set("orderId", orderId);
  if (reference) params.set("reference", reference);
  res.redirect(`${appUrl}/payment/return?${params.toString()}`);
});

router.get("/:orderId", async (req, res) => {
  try {
    const result = await syncOrderPayment(req.params.orderId, {
      reference: req.query.reference || req.query.refid || undefined,
    });
    res.json({
      success: result.payment?.status === "paid",
      ...result,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
