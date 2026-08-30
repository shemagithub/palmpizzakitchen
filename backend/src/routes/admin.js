import { Router } from "express";
import { query } from "../db.js";
import { adminRequired } from "../middleware/auth.js";
import { getKitchenInbox, isMailConfigured, sendFromShopMailbox, sendMail } from "../mail.js";

const router = Router();

function toIso(value) {
  if (!value) return new Date().toISOString();
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

async function safeRows(sql, params = []) {
  try {
    return await query(sql, params);
  } catch (err) {
    console.error("Notifications query failed:", err.message);
    return [];
  }
}

async function loadMailbox() {
  try {
    return await import("../services/mailbox.js");
  } catch {
    return null;
  }
}

function mailboxFallback() {
  return {
    configured: false,
    email: process.env.IMAP_USER || "info@palmpizzakitchen.com",
    name: process.env.MAILBOX_NAME || "Palm Pizza Kitchen",
    host: process.env.IMAP_HOST || "palmpizzakitchen.com",
    imapPort: Number(process.env.IMAP_PORT || 993),
    smtpPort: Number(process.env.MAILBOX_SMTP_PORT || 465),
  };
}

function mailboxAccess(req, res, next) {
  const key = String(process.env.MAILBOX_INTERNAL_KEY || "").trim();
  const sent = String(req.headers["x-palm-mailbox"] || "").trim();
  if (key && sent && sent === key) return next();
  return adminRequired(req, res, next);
}

router.get("/mailbox/config", mailboxAccess, async (_req, res) => {
  const mb = await loadMailbox();
  if (!mb) return res.json({ ...mailboxFallback(), needsSetup: true });
  if (typeof mb.refreshMailboxSettings === "function") {
    await mb.refreshMailboxSettings();
  }
  const cfg = mb.mailboxConfig();
  const configured = mb.isMailboxConfigured();
  res.json({
    configured,
    needsSetup: !configured,
    email: cfg.user,
    name: cfg.displayName,
    host: cfg.host,
    imapPort: cfg.imapPort,
    smtpPort: cfg.smtpPort,
  });
});

router.put("/mailbox/credentials", adminRequired, async (req, res) => {
  try {
    const user = String(req.body?.user || req.body?.imap_user || "")
      .trim()
      .toLowerCase();
    const pass = String(req.body?.pass || req.body?.imap_pass || "").trim();
    const host = String(
      req.body?.host || req.body?.imap_host || "palmpizzakitchen.com",
    ).trim();
    const name = String(
      req.body?.name || req.body?.mailbox_name || "Palm Pizza Kitchen",
    ).trim();
    const imapPort = String(req.body?.imapPort || req.body?.imap_port || "993");
    const smtpPort = String(
      req.body?.smtpPort || req.body?.mailbox_smtp_port || "465",
    );
    const imapIp = String(
      req.body?.imapIp || req.body?.imap_ip || "68.65.123.100",
    ).trim();

    if (!user || !user.includes("@")) {
      return res.status(400).json({ error: "Enter a valid mailbox email." });
    }
    if (!pass) {
      return res.status(400).json({ error: "Enter the mailbox password." });
    }

    const pairs = [
      ["imap_user", user],
      ["imap_pass", pass],
      ["imap_host", host || "palmpizzakitchen.com"],
      ["imap_ip", imapIp || "68.65.123.100"],
      ["imap_port", imapPort || "993"],
      ["imap_tls_name", host || "palmpizzakitchen.com"],
      ["mailbox_name", name || "Palm Pizza Kitchen"],
      ["mailbox_smtp_port", smtpPort || "465"],
    ];
    for (const [key, value] of pairs) {
      await query(
        `INSERT INTO settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, value],
      );
    }

    const mb = await loadMailbox();
    if (mb?.invalidateMailboxCache) mb.invalidateMailboxCache();
    if (mb?.refreshMailboxSettings) await mb.refreshMailboxSettings();

    if (!mb || !mb.isMailboxConfigured()) {
      return res.json({
        ok: true,
        configured: false,
        error: "Saved, but mailbox helper is missing on this server.",
      });
    }

    try {
      await mb.listFolders();
      return res.json({ ok: true, configured: true, email: user });
    } catch (err) {
      return res.status(400).json({
        ok: false,
        configured: false,
        error:
          err instanceof Error
            ? err.message
            : "Saved, but login to the mailbox failed. Check the password.",
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/mailbox/folders", mailboxAccess, async (_req, res) => {
  try {
    const mb = await loadMailbox();
    if (mb?.refreshMailboxSettings) await mb.refreshMailboxSettings();
    if (!mb || !mb.isMailboxConfigured()) {
      return res.json({
        folders: [],
        labels: [],
        error:
          "Mailbox password is missing. Use the setup form on this page to save it.",
      });
    }
    res.json(await mb.listFolders());
  } catch (err) {
    res.json({ folders: [], labels: [], error: err.message });
  }
});

router.post("/mailbox/folders", mailboxAccess, async (req, res) => {
  try {
    const mb = await loadMailbox();
    if (!mb) return res.status(400).json({ error: "Mailbox is not installed yet." });
    res.status(201).json(await mb.createLabel(req.body?.name));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/mailbox/messages", mailboxAccess, async (req, res) => {
  try {
    const mb = await loadMailbox();
    if (mb?.refreshMailboxSettings) await mb.refreshMailboxSettings();
    if (!mb || !mb.isMailboxConfigured()) {
      return res.json({
        total: 0,
        page: 1,
        pageSize: 40,
        messages: [],
        error:
          "Mailbox password is missing. Use the setup form on this page to save the info@ password.",
      });
    }
    res.json(
      await mb.listMessages({
        folder: String(req.query.folder || "INBOX"),
        q: String(req.query.q || ""),
        filter: String(req.query.filter || "all"),
        page: Number(req.query.page || 1),
        pageSize: Number(req.query.pageSize || 200),
      }),
    );
  } catch (err) {
    res.json({ total: 0, page: 1, pageSize: 40, messages: [], error: err.message });
  }
});

router.get("/mailbox/messages/:uid/attachments/:index", mailboxAccess, async (req, res) => {
  try {
    const mb = await loadMailbox();
    if (!mb) return res.status(404).json({ error: "Mailbox is not installed yet." });
    const att = await mb.getAttachment(
      String(req.query.folder || "INBOX"),
      req.params.uid,
      req.params.index,
    );
    const filename = String(att.filename || "attachment").replace(/[\r\n"]/g, "");
    const asDownload = String(req.query.download || "") === "1";
    res.setHeader("Content-Type", att.contentType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `${asDownload ? "attachment" : "inline"}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.send(att.content);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.get("/mailbox/messages/:uid", mailboxAccess, async (req, res) => {
  try {
    const mb = await loadMailbox();
    if (!mb) return res.status(404).json({ error: "Mailbox is not installed yet." });
    res.json({
      message: await mb.getMessage(
        String(req.query.folder || "INBOX"),
        req.params.uid,
      ),
    });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.post("/mailbox/messages/:uid/flags", mailboxAccess, async (req, res) => {
  try {
    const mb = await loadMailbox();
    if (!mb) return res.status(400).json({ error: "Mailbox is not installed yet." });
    res.json(
      await mb.setFlags(
        String(req.body?.folder || req.query.folder || "INBOX"),
        req.params.uid,
        {
          seen: req.body?.seen,
          flagged: req.body?.flagged,
          deleted: req.body?.deleted,
        },
      ),
    );
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/mailbox/messages/:uid/move", mailboxAccess, async (req, res) => {
  try {
    const mb = await loadMailbox();
    if (!mb) return res.status(400).json({ error: "Mailbox is not installed yet." });
    const to = String(req.body?.to || "").trim();
    if (!to) return res.status(400).json({ error: "Destination folder required." });
    res.json(
      await mb.moveMessage(
        String(req.body?.from || req.query.folder || "INBOX"),
        req.params.uid,
        to,
      ),
    );
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/mailbox/send", mailboxAccess, async (req, res) => {
  try {
    const payload = {
      to: req.body?.to,
      cc: req.body?.cc,
      bcc: req.body?.bcc,
      subject: req.body?.subject,
      text: req.body?.text,
      html: req.body?.html,
      inReplyTo: req.body?.inReplyTo,
      references: req.body?.references,
      attachments: req.body?.attachments,
      saveDraft: Boolean(req.body?.saveDraft),
    };
    const mb = await loadMailbox();
    if (mb) {
      try {
        return res.status(201).json(await mb.sendMailboxMessage(payload));
      } catch (err) {
        console.error("IMAP send failed, using SMTP:", err.message);
      }
    }
    if (payload.saveDraft) {
      return res.status(400).json({ error: "Drafts need IMAP. Upload mailbox.js and restart." });
    }
    const files = (payload.attachments || []).map((file) => ({
      filename: file.filename,
      content: file.content,
      encoding: file.encoding || "base64",
      contentType: file.contentType,
    }));
    const data = await sendFromShopMailbox({
      ...payload,
      attachments: files,
    });
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not send." });
  }
});

router.get("/notifications", adminRequired, async (_req, res) => {
  try {
    const items = [];

    const orders = await safeRows(
      `SELECT id, customer_name, total, status, payment_status, created_at
       FROM orders
       ORDER BY created_at DESC
       LIMIT 20`,
    );
    for (const row of orders) {
      const paid = String(row.payment_status || "").toLowerCase() === "paid";
      const name = row.customer_name || "Customer";
      items.push({
        id: `order-${row.id}`,
        type: "order",
        title: paid ? `New paid order from ${name}` : `New order from ${name}`,
        body: `${row.id} · ${row.status}${paid ? "" : " · awaiting payment"}`,
        href: "/admin/orders",
        amount: Number(row.total) || 0,
        createdAt: toIso(row.created_at),
      });
    }

    const paidRows = await safeRows(
      `SELECT id, customer_name, total, paid_at, created_at
       FROM orders
       WHERE payment_status = 'paid' AND paid_at IS NOT NULL
       ORDER BY paid_at DESC
       LIMIT 12`,
    );
    for (const row of paidRows) {
      const created = new Date(row.created_at).getTime();
      const paidAt = new Date(row.paid_at).getTime();
      if (Number.isNaN(paidAt) || Number.isNaN(created)) continue;
      if (paidAt - created < 90 * 1000) continue;
      items.push({
        id: `paid-${row.id}-${paidAt}`,
        type: "payment",
        title: `Payment received from ${row.customer_name || "customer"}`,
        body: `Order ${row.id} is paid`,
        href: "/admin/orders",
        amount: Number(row.total) || 0,
        createdAt: toIso(row.paid_at),
      });
    }

    const messages = await safeRows(
      `SELECT id, name, email, message, created_at
       FROM contact_messages
       ORDER BY created_at DESC
       LIMIT 15`,
    );
    for (const row of messages) {
      const preview = String(row.message || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 90);
      items.push({
        id: `contact-${row.id}`,
        type: "message",
        title: `Message from ${row.name || "visitor"}`,
        body: preview || row.email || "Contact form",
        href: "/admin/contact",
        createdAt: toIso(row.created_at),
      });
    }

    const customers = await safeRows(
      `SELECT id, name, email, created_at
       FROM users
       WHERE role = 'customer'
       ORDER BY created_at DESC
       LIMIT 10`,
    );
    for (const row of customers) {
      items.push({
        id: `customer-${row.id}`,
        type: "customer",
        title: `New customer ${row.name || "account"}`,
        body: row.email || "Signed up on the website",
        href: "/admin/customers",
        createdAt: toIso(row.created_at),
      });
    }

    const subscribers = await safeRows(
      `SELECT id, email, created_at
       FROM newsletter_subscribers
       ORDER BY created_at DESC
       LIMIT 10`,
    );
    for (const row of subscribers) {
      items.push({
        id: `news-${row.id}`,
        type: "newsletter",
        title: "Newsletter signup",
        body: row.email || "New email on the list",
        href: "/admin/contact",
        createdAt: toIso(row.created_at),
      });
    }

    items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    res.json({ notifications: items.slice(0, 30) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats", adminRequired, async (_req, res) => {
  try {
    const todayOrders = await query(
      `SELECT COUNT(*) AS c, COALESCE(SUM(total),0) AS revenue
       FROM orders
       WHERE DATE(created_at) = CURDATE()
         AND status != 'Cancelled'`,
    );
    const activeDeliveries = await query(
      `SELECT COUNT(*) AS c FROM orders
       WHERE status IN ('Preparing', 'Out for delivery')`,
    );
    const newCustomers = await query(
      `SELECT COUNT(*) AS c FROM users
       WHERE role = 'customer' AND DATE(created_at) = CURDATE()`,
    );

    const weekRows = await query(
      `SELECT DATE(created_at) AS day,
              COUNT(*) AS orders,
              COALESCE(SUM(total), 0) AS revenue
       FROM orders
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         AND status != 'Cancelled'
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
    );

    const byDay = new Map(
      weekRows.map((r) => {
        const raw = r.day;
        let key;
        if (raw instanceof Date) {
          const y = raw.getFullYear();
          const m = String(raw.getMonth() + 1).padStart(2, "0");
          const d = String(raw.getDate()).padStart(2, "0");
          key = `${y}-${m}-${d}`;
        } else {
          key = String(raw).slice(0, 10);
        }
        return [
          key,
          {
            orders: Number(r.orders),
            revenue: Number(r.revenue),
          },
        ];
      }),
    );

    const revenueByDay = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${day}`;
      const point = byDay.get(key) || { orders: 0, revenue: 0 };
      revenueByDay.push({
        date: key,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        fullLabel: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        orders: point.orders,
        revenue: point.revenue,
      });
    }

    const statusRows = await query(
      `SELECT status, COUNT(*) AS c FROM orders GROUP BY status`,
    );
    const statusOrder = [
      "Pending",
      "Preparing",
      "Out for delivery",
      "Delivered",
      "Cancelled",
    ];
    const statusMap = Object.fromEntries(
      statusRows.map((r) => [r.status, Number(r.c)]),
    );
    const ordersByStatus = statusOrder.map((status) => ({
      status,
      count: statusMap[status] || 0,
    }));

    const topItems = await query(
      `SELECT oi.name, SUM(oi.quantity) AS qty
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status != 'Cancelled'
       GROUP BY oi.name
       ORDER BY qty DESC
       LIMIT 6`,
    );

    const weekRevenue = revenueByDay.reduce((s, d) => s + d.revenue, 0);
    const weekOrders = revenueByDay.reduce((s, d) => s + d.orders, 0);

    res.json({
      stats: [
        {
          label: "Today's orders",
          value: String(todayOrders[0].c),
          change: "Today",
          tone: "text-pam-basil",
        },
        {
          label: "Revenue",
          value: `RWF ${Math.round(Number(todayOrders[0].revenue)).toLocaleString("en-US")}`,
          change: "Today",
          tone: "text-pam-basil",
        },
        {
          label: "Active deliveries",
          value: String(activeDeliveries[0].c),
          change: "Live",
          tone: "text-pam-red",
        },
        {
          label: "New customers",
          value: String(newCustomers[0].c),
          change: "Today",
          tone: "text-pam-gold",
        },
      ],
      charts: {
        revenueByDay,
        ordersByStatus,
        topItems: topItems.map((r) => ({
          name: r.name,
          qty: Number(r.qty),
        })),
        weekSummary: {
          revenue: weekRevenue,
          orders: weekOrders,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const ORDER_IDENTITY_SQL = `COALESCE(
  NULLIF(LOWER(TRIM(customer_email)), ''),
  IF(
    NULLIF(TRIM(phone), '') IS NULL,
    NULL,
    CONCAT('tel:', REPLACE(REPLACE(REPLACE(TRIM(phone), ' ', ''), '-', ''), '+', ''))
  ),
  CONCAT('name:', LOWER(TRIM(customer_name)))
)`;

function formatJoinedMonth(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function encodeCheckoutId(identity) {
  return `CHK-${Buffer.from(String(identity || ""), "utf8").toString("base64url")}`;
}

function parseCustomerRef(raw) {
  const value = String(raw || "").trim();
  const userMatch = value.match(/^(?:CUS-)?(\d+)$/i);
  if (userMatch) return { type: "account", userId: Number(userMatch[1]) };
  if (/^CHK-/i.test(value)) {
    try {
      return {
        type: "checkout",
        identity: Buffer.from(value.slice(4), "base64url").toString("utf8"),
      };
    } catch {
      return null;
    }
  }
  return null;
}

function mapOrderDetail(order, items, extra = {}) {
  return {
    id: order.id,
    customer: order.customer_name,
    phone: order.phone,
    address: order.address,
    paymentMethod: order.payment_method,
    status: order.status,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.delivery_fee),
    total: Number(order.total),
    notes: order.notes || "",
    time: order.created_at,
    updatedAt: order.updated_at,
    items: items.map((i) => `${i.name} ×${i.quantity}`).join(", "),
    lineItems: items.map((i) => ({
      name: i.name,
      unitPrice: Number(i.unit_price),
      quantity: i.quantity,
      lineTotal: Number(i.unit_price) * i.quantity,
    })),
    ...extra,
  };
}

router.get("/customers", adminRequired, async (_req, res) => {
  try {
    const accountRows = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.email_verified, u.created_at AS joined,
              COALESCE(stats.orders, 0) AS orders,
              COALESCE(stats.spent, 0) AS spent
       FROM users u
       LEFT JOIN (
         SELECT u2.id AS user_id,
                COUNT(o.id) AS orders,
                COALESCE(SUM(CASE WHEN o.status != 'Cancelled' THEN o.total ELSE 0 END), 0) AS spent
         FROM users u2
         LEFT JOIN orders o
           ON o.user_id = u2.id
           OR (
             NULLIF(u2.email, '') IS NOT NULL
             AND LOWER(TRIM(o.customer_email)) = LOWER(u2.email)
           )
         WHERE u2.role = 'customer'
         GROUP BY u2.id
       ) stats ON stats.user_id = u.id
       WHERE u.role = 'customer'
       ORDER BY u.created_at DESC`,
    );

    const checkoutRows = await query(
      `SELECT
         ${ORDER_IDENTITY_SQL} AS identity,
         MAX(customer_name) AS name,
         MAX(NULLIF(TRIM(customer_email), '')) AS email,
         MAX(NULLIF(TRIM(phone), '')) AS phone,
         COUNT(*) AS orders,
         COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN total ELSE 0 END), 0) AS spent,
         MIN(created_at) AS joined
       FROM orders o
       WHERE NOT EXISTS (
         SELECT 1 FROM users u
         WHERE u.role = 'customer'
           AND (
             o.user_id = u.id
             OR (
               NULLIF(u.email, '') IS NOT NULL
               AND LOWER(TRIM(o.customer_email)) = LOWER(u.email)
             )
             OR (
               NULLIF(u.phone, '') IS NOT NULL
               AND REPLACE(REPLACE(REPLACE(u.phone, ' ', ''), '-', ''), '+', '')
                 = REPLACE(REPLACE(REPLACE(o.phone, ' ', ''), '-', ''), '+', '')
             )
           )
       )
       GROUP BY COALESCE(
         NULLIF(LOWER(TRIM(customer_email)), ''),
         IF(
           NULLIF(TRIM(phone), '') IS NULL,
           NULL,
           CONCAT('tel:', REPLACE(REPLACE(REPLACE(TRIM(phone), ' ', ''), '-', ''), '+', ''))
         ),
         CONCAT('name:', LOWER(TRIM(customer_name)))
       )
       ORDER BY joined DESC`,
    );

    const accounts = accountRows.map((row) => ({
      id: `CUS-${row.id}`,
      userId: Number(row.id),
      source: "account",
      hasAccount: true,
      name: row.name,
      email: row.email,
      phone: row.phone || "",
      emailVerified: Boolean(row.email_verified),
      orders: Number(row.orders),
      spent: Number(row.spent),
      joined: formatJoinedMonth(row.joined),
      joinedAt: row.joined,
    }));

    const checkout = checkoutRows.map((row) => ({
      id: encodeCheckoutId(row.identity),
      source: "checkout",
      hasAccount: false,
      name: row.name,
      email: row.email || "",
      phone: row.phone || "",
      emailVerified: false,
      orders: Number(row.orders),
      spent: Number(row.spent),
      joined: formatJoinedMonth(row.joined),
      joinedAt: row.joined,
    }));

    const customers = [...accounts, ...checkout].sort((a, b) => {
      return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
    });

    res.json({
      customers,
      summary: {
        accounts: accounts.length,
        checkout: checkout.length,
        total: customers.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/customers/:id", adminRequired, async (req, res) => {
  try {
    const ref = parseCustomerRef(req.params.id);
    if (!ref) {
      return res.status(400).json({ error: "Invalid customer id." });
    }

    if (ref.type === "checkout") {
      const orders = await query(
        `SELECT id, customer_name, customer_email, phone, address, payment_method, status,
                subtotal, delivery_fee, total, notes, created_at, updated_at
         FROM orders
         WHERE ${ORDER_IDENTITY_SQL} = ?
         ORDER BY created_at DESC
         LIMIT 50`,
        [ref.identity],
      );
      if (!orders.length) {
        return res.status(404).json({ error: "Customer not found." });
      }

      const orderDetails = [];
      for (const order of orders) {
        const items = await query(
          `SELECT name, unit_price, quantity FROM order_items WHERE order_id = ?`,
          [order.id],
        );
        orderDetails.push(mapOrderDetail(order, items, { guestCheckout: true }));
      }

      const latest = orders[0];
      const spent = orders.reduce(
        (sum, order) =>
          order.status === "Cancelled" ? sum : sum + Number(order.total || 0),
        0,
      );
      const delivered = orders.filter((order) => order.status === "Delivered").length;
      const cancelled = orders.filter((order) => order.status === "Cancelled").length;

      return res.json({
        customer: {
          id: encodeCheckoutId(ref.identity),
          source: "checkout",
          hasAccount: false,
          name: latest.customer_name,
          email: latest.customer_email || "",
          phone: latest.phone || "",
          role: "checkout",
          emailVerified: false,
          joinedAt: orders[orders.length - 1].created_at,
          joined: new Date(orders[orders.length - 1].created_at).toLocaleString(
            "en-US",
            { dateStyle: "medium", timeStyle: "short" },
          ),
          orders: orders.length,
          spent,
          delivered,
          cancelled,
          lastOrderAt: latest.created_at || null,
          orderHistory: orderDetails,
          possibleGuestOrders: [],
        },
      });
    }

    const userId = ref.userId;
    if (!userId) {
      return res.status(400).json({ error: "Invalid customer id." });
    }

    const users = await query(
      `SELECT id, name, email, phone, role, email_verified, created_at
       FROM users WHERE id = ? AND role = 'customer'`,
      [userId],
    );
    if (!users.length) {
      return res.status(404).json({ error: "Customer not found." });
    }
    const user = users[0];

    const statsRows = await query(
      `SELECT
         COUNT(*) AS orders,
         COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN total ELSE 0 END), 0) AS spent,
         COALESCE(SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END), 0) AS delivered,
         COALESCE(SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END), 0) AS cancelled,
         MAX(created_at) AS last_order_at
       FROM orders
       WHERE user_id = ?`,
      [userId],
    );
    const stats = statsRows[0] || {};

    const orders = await query(
      `SELECT id, customer_name, phone, address, payment_method, status,
              subtotal, delivery_fee, total, notes, created_at, updated_at
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    );

    const orderDetails = [];
    for (const order of orders) {
      const items = await query(
        `SELECT name, unit_price, quantity FROM order_items WHERE order_id = ?`,
        [order.id],
      );
      orderDetails.push({
        id: order.id,
        customer: order.customer_name,
        phone: order.phone,
        address: order.address,
        paymentMethod: order.payment_method,
        status: order.status,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.delivery_fee),
        total: Number(order.total),
        notes: order.notes || "",
        time: order.created_at,
        updatedAt: order.updated_at,
        items: items.map((i) => `${i.name} ×${i.quantity}`).join(", "),
        lineItems: items.map((i) => ({
          name: i.name,
          unitPrice: Number(i.unit_price),
          quantity: i.quantity,
          lineTotal: Number(i.unit_price) * i.quantity,
        })),
      });
    }

    // Also catch guest-style orders that used the same email/phone on checkout
    // when they weren't logged in - rare, but helpful. Skip if already linked.
    const linkedIds = new Set(orderDetails.map((o) => o.id));
    const loose = await query(
      `SELECT id, customer_name, phone, address, payment_method, status,
              subtotal, delivery_fee, total, notes, created_at, updated_at
       FROM orders
       WHERE user_id IS NULL
         AND (
           LOWER(customer_name) = LOWER(?)
           OR (? <> '' AND phone = ?)
           OR (? <> '' AND LOWER(customer_email) = LOWER(?))
         )
       ORDER BY created_at DESC
       LIMIT 20`,
      [user.name, user.phone || "", user.phone || "", user.email || "", user.email || ""],
    );

    const guestOrders = [];
    for (const order of loose) {
      if (linkedIds.has(order.id)) continue;
      const items = await query(
        `SELECT name, unit_price, quantity FROM order_items WHERE order_id = ?`,
        [order.id],
      );
      guestOrders.push({
        id: order.id,
        customer: order.customer_name,
        phone: order.phone,
        address: order.address,
        paymentMethod: order.payment_method,
        status: order.status,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.delivery_fee),
        total: Number(order.total),
        notes: order.notes || "",
        time: order.created_at,
        updatedAt: order.updated_at,
        guestCheckout: true,
        items: items.map((i) => `${i.name} ×${i.quantity}`).join(", "),
        lineItems: items.map((i) => ({
          name: i.name,
          unitPrice: Number(i.unit_price),
          quantity: i.quantity,
          lineTotal: Number(i.unit_price) * i.quantity,
        })),
      });
    }

    res.json({
      customer: {
        id: `CUS-${user.id}`,
        userId: Number(user.id),
        source: "account",
        hasAccount: true,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        emailVerified: Boolean(user.email_verified),
        joinedAt: user.created_at,
        joined: new Date(user.created_at).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
        orders: Number(stats.orders || 0),
        spent: Number(stats.spent || 0),
        delivered: Number(stats.delivered || 0),
        cancelled: Number(stats.cancelled || 0),
        lastOrderAt: stats.last_order_at || null,
        orderHistory: orderDetails,
        possibleGuestOrders: guestOrders,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/customers/:id", adminRequired, async (req, res) => {
  try {
    const ref = parseCustomerRef(req.params.id);
    if (!ref) {
      return res.status(400).json({ error: "Invalid customer id." });
    }

    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Name is required." });
    }

    if (ref.type === "checkout") {
      const result = await query(
        `UPDATE orders
         SET customer_name = ?,
             customer_email = ?,
             phone = ?
         WHERE ${ORDER_IDENTITY_SQL} = ?`,
        [name, email || null, phone || "-", ref.identity],
      );
      if (!result.affectedRows) {
        return res.status(404).json({ error: "Customer not found." });
      }
      return res.json({ ok: true });
    }

    const users = await query(
      `SELECT id, role, email FROM users WHERE id = ?`,
      [ref.userId],
    );
    if (!users.length || users[0].role !== "customer") {
      return res.status(404).json({ error: "Customer not found." });
    }
    if (email && email !== users[0].email) {
      if (!email.includes("@")) {
        return res.status(400).json({ error: "Enter a valid email address." });
      }
      const taken = await query(
        `SELECT id FROM users WHERE email = ? AND id != ?`,
        [email, ref.userId],
      );
      if (taken.length) {
        return res.status(409).json({ error: "That email is already used." });
      }
    }

    await query(
      `UPDATE users SET name = ?, email = COALESCE(NULLIF(?, ''), email), phone = ?
       WHERE id = ? AND role = 'customer'`,
      [name, email, phone || null, ref.userId],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/customers/:id", adminRequired, async (req, res) => {
  try {
    const ref = parseCustomerRef(req.params.id);
    if (!ref) {
      return res.status(400).json({ error: "Invalid customer id." });
    }

    if (ref.type === "checkout") {
      const result = await query(
        `DELETE FROM orders WHERE ${ORDER_IDENTITY_SQL} = ?`,
        [ref.identity],
      );
      if (!result.affectedRows) {
        return res.status(404).json({ error: "Customer not found." });
      }
      return res.json({ ok: true, removed: "checkout-orders" });
    }

    const users = await query(
      `SELECT id, role FROM users WHERE id = ?`,
      [ref.userId],
    );
    if (!users.length || users[0].role !== "customer") {
      return res.status(404).json({ error: "Customer not found." });
    }

    await query(`DELETE FROM users WHERE id = ? AND role = 'customer'`, [
      ref.userId,
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PUBLIC_SETTINGS_BLOCKLIST = new Set([
  "imap_pass",
  "mailbox_pass",
  "smtp_pass",
  "xentripay_api_key",
  "xentripay_webhook_secret",
  "jwt_secret",
]);

router.get("/settings", async (_req, res) => {
  try {
    const rows = await query(`SELECT setting_key, setting_value FROM settings`);
    const settings = Object.fromEntries(
      rows
        .filter((r) => !PUBLIC_SETTINGS_BLOCKLIST.has(String(r.setting_key)))
        .filter((r) => !String(r.setting_key).endsWith("_pass"))
        .filter((r) => !String(r.setting_key).endsWith("_secret"))
        .map((r) => [r.setting_key, r.setting_value]),
    );
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/settings", adminRequired, async (req, res) => {
  try {
    const allowed = [
      "accepting_orders",
      "delivery_fee",
      "delivery_area_fees",
      "min_order",
      "kitchen_note",
      "open_hours",
      "company_name",
      "company_tagline",
      "logo_url",
      "footer_blurb",
      "about_text",
      "phone",
      "email",
      "address",
      "social_instagram",
      "social_facebook",
      "social_tiktok",
      "social_twitter",
      "social_whatsapp",
      "promo_badge",
      "hero_slides",
      "testimonials",
      "combo_banner",
      "trust_points",
      "quick_categories",
      "order_cta",
      "about_subtitle",
      "about_story_title",
      "about_story_image",
    ];
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) {
        await query(
          `INSERT INTO settings (setting_key, setting_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [key, String(req.body[key])],
        );
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/contact", adminRequired, async (_req, res) => {
  try {
    const rows = await query(
      `SELECT id, name, email, message, created_at
       FROM contact_messages
       ORDER BY created_at DESC
       LIMIT 300`,
    );
    res.json({
      messages: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        message: row.message,
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/contact/:id", adminRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid message." });
    const result = await query(`DELETE FROM contact_messages WHERE id = ?`, [
      id,
    ]);
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Message not found." });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body || {};
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ error: "All contact fields are required." });
    }
    await query(
      `INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)`,
      [name.trim(), email.trim(), message.trim()],
    );
    if (isMailConfigured()) {
      const fromName = name.trim();
      const fromEmail = email.trim();
      const body = message.trim();
      await sendMail({
        to: getKitchenInbox(),
        subject: `Website contact - ${fromName}`,
        text: `New message from the Palm Pizza website.\n\nName: ${fromName}\nEmail: ${fromEmail}\n\n${body}`,
        html: `
          <div style="font-family:Nunito,Arial,sans-serif;padding:24px;color:#1c1917;">
            <h2 style="margin:0 0 12px;">Website contact form</h2>
            <p><strong>Name:</strong> ${fromName.replace(/</g, "&lt;")}</p>
            <p><strong>Email:</strong> ${fromEmail.replace(/</g, "&lt;")}</p>
            <p style="white-space:pre-wrap;margin-top:16px;">${body.replace(/</g, "&lt;")}</p>
          </div>`,
      }).catch((error) => console.error("Contact email failed:", error.message));
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/newsletter", async (req, res) => {
  try {
    const email = req.body?.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email required." });
    }
    await query(
      `INSERT INTO newsletter_subscribers (email) VALUES (?)
       ON DUPLICATE KEY UPDATE email = email`,
      [email],
    );
    if (isMailConfigured()) {
      await sendMail({
        to: getKitchenInbox(),
        subject: `Newsletter signup - ${email}`,
        text: `${email} subscribed to Palm Pizza Kitchen updates from the website.`,
        html: `<p><strong>${email}</strong> subscribed to Palm Pizza Kitchen updates from the website.</p>`,
      }).catch((error) =>
        console.error("Newsletter email failed:", error.message),
      );
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
