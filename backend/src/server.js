import "./loadEnv.js";
import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import { ensureSchema } from "./ensureSchema.js";
import { seedDatabase } from "./scripts/seed.js";
import authRoutes from "./routes/auth.js";
import menuRoutes from "./routes/menu.js";
import cartRoutes from "./routes/cart.js";
import orderRoutes from "./routes/orders.js";
import offerRoutes from "./routes/offers.js";
import adminRoutes from "./routes/admin.js";
import mailboxRoutes from "./routes/mailbox.js";
import uploadRoutes, { uploadsDir } from "./routes/upload.js";
import paymentRoutes from "./routes/payments.js";
import payoutRoutes from "./routes/payouts.js";
import transactionRoutes from "./routes/transactions.js";
import kitchenRoutes from "./routes/kitchen.js";
import { handleXentriPayWebhook } from "./services/xentripayWebhook.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const passenger =
  typeof globalThis.PhusionPassenger !== "undefined"
    ? globalThis.PhusionPassenger
    : null;

app.disable("x-powered-by");
app.set("trust proxy", 1);

/**
 * cPanel “Run NPM Install” hits this URL and compares Content-Type exactly.
 * Express 404 uses "text/html; charset=utf-8"; Apache uses "text/html" - that
 * mismatch is reported as a failed install even when npm succeeded.
 */
app.get("/", (_req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(
    "<!DOCTYPE html><html><head><title>Palm Pizza API</title></head><body>Palm Pizza Kitchen API</body></html>",
  );
});

const corsOrigins = String(
  process.env.CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000",
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      try {
        const host = new URL(origin).hostname;
        if (
          host === "palmpizzakitchen.com" ||
          host.endsWith(".palmpizzakitchen.com")
        ) {
          return callback(null, true);
        }
      } catch {
        /* ignore invalid Origin */
      }
      if (
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|127\.0\.0\.1\.nip\.io|[\w-]+\.nip\.io|[\w-]+\.localtest\.me):\d+$/.test(
          origin,
        )
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.post(
  ["/api/webhooks/xentripay", "/api/payments/xentripay/webhook"],
  express.raw({ type: "*/*", limit: "1mb" }),
  handleXentriPayWebhook,
);
app.use(express.json({ limit: "8mb" }));
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, service: "palm-pizza-backend", db: "up" });
  } catch (err) {
    res.status(500).json({ ok: false, db: "down", error: err.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payouts", payoutRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/kitchen", kitchenRoutes);
app.use("/api/mailbox", mailboxRoutes);
app.use("/api", adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Server error." });
});

function bindHttp() {
  if (passenger) {
    passenger.configure({ autoInstall: false });
    app.listen("passenger");
    console.log("Palm Pizza API running (cPanel Passenger)");
    return;
  }

  app.listen(port, () => {
    const configBase = (
      process.env.XENTRIPAY_API_BASE || "https://xentripay.com"
    ).replace(/\/$/, "");
    const live = !configBase.includes("merchant.test");
    console.log(`Palm Pizza API running on http://localhost:${port}`);
    console.log(`→ XentriPay ${live ? "LIVE" : "TEST"} ${configBase}`);
  });
}

async function prepareDatabase() {
  await ensureSchema();
  if (process.env.AUTO_SEED !== "0") {
    const [rows] = await pool.query(`SELECT COUNT(*) AS c FROM menu_items`);
    if (Number(rows[0].c) === 0) {
      console.log("→ Empty database - seeding default data…");
      await seedDatabase();
    }
  }
}

async function start() {
  // Passenger health-checks / immediately; bind before slow MySQL work.
  if (passenger) {
    bindHttp();
  }

  try {
    await prepareDatabase();
  } catch (err) {
    console.error("Failed to start server:", err.message);
    if (!passenger) process.exit(1);
    return;
  }

  if (!passenger) {
    bindHttp();
  }
}

start();
