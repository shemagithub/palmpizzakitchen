import { query } from "../db.js";
import { getKitchenInbox, isMailConfigured, sendMail } from "../mail.js";
import { buildOrderReceiptPdf } from "./receiptPdf.js";
import {
  extractCollectionPaymentUrl,
  getCardCheckoutUrls,
  getXentriPayConfig,
  initiateCollection,
  mapCollectionStatusToPayment,
  resolveCollectionRefid,
  resolveCollectionStatusForTransaction,
} from "./xentriPayService.js";

function uniqueRef(orderId) {
  return `PALM-${orderId}-${Date.now()}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isPickupOrder(order) {
  const notes = String(order.notes || "");
  const address = String(order.address || "");
  return (
    notes.includes("fulfillment:pickup") || /pickup/i.test(address)
  );
}

export function paymentMethodLabel(method) {
  const map = {
    card: "Card",
    cc: "Card",
    airtel_money: "Airtel Money",
    mtn_momo: "MTN MoMo",
    momo: "MTN MoMo",
    airtel: "Airtel Money",
  };
  return map[method] || method || "Payment";
}

export async function getSettingsMap() {
  const rows = await query(`SELECT setting_key, setting_value FROM settings`);
  return Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
}

export async function loadOrderBundle(orderId) {
  const orders = await query(`SELECT * FROM orders WHERE id = ?`, [orderId]);
  if (!orders.length) return null;
  const items = await query(
    `SELECT name, unit_price, quantity FROM order_items WHERE order_id = ?`,
    [orderId],
  );
  return {
    order: orders[0],
    items: items.map((item) => ({
      name: item.name,
      unitPrice: Number(item.unit_price),
      quantity: Number(item.quantity),
    })),
  };
}

async function latestTransaction(orderId) {
  const rows = await query(
    `SELECT * FROM payment_transactions WHERE order_id = ? ORDER BY id DESC LIMIT 1`,
    [orderId],
  );
  return rows[0] || null;
}

function publicPayment(tx, extra = {}) {
  if (!tx) return null;
  return {
    status: tx.status,
    reference: tx.customer_reference,
    refid: tx.gateway_refid,
    amount: Number(tx.amount),
    currency: tx.currency || "RWF",
    method: tx.pmethod,
    paymentUrl: tx.payment_url || null,
    ...extra,
  };
}

export async function initiateOrderPayment({
  order,
  items,
  email,
  phone,
  paymentMethod,
}) {
  const config = getXentriPayConfig();
  if (!config.isConfigured) {
    const err = new Error(
      "XentriPay is not configured. Add XENTRIPAY_API_KEY in backend/.env.",
    );
    err.status = 503;
    throw err;
  }

  const pmethod = paymentMethod === "card" ? "cc" : "momo";
  const customerReference = uniqueRef(order.id);
  const urls = getCardCheckoutUrls({
    orderId: order.id,
    reference: customerReference,
  });

  await query(
    `INSERT INTO payment_transactions
      (order_id, customer_reference, amount, currency, pmethod, status)
     VALUES (?, ?, ?, 'RWF', ?, 'pending')`,
    [order.id, customerReference, Number(order.total), pmethod],
  );

  const gateway = await initiateCollection({
    email,
    cname: order.customer_name,
    amount: order.total,
    phone,
    pmethod,
    chargesIncluded: true,
    redirectUrl: urls.redirectUrl,
    returnUrl: urls.returnUrl,
    customerReference,
    details: `Palm Pizza order ${order.id}`,
  });

  const refid = resolveCollectionRefid(gateway, customerReference);
  const paymentUrl = extractCollectionPaymentUrl(gateway);

  await query(
    `UPDATE payment_transactions
     SET gateway_refid = ?, gateway_tid = ?, payment_url = ?, gateway_payload = ?, status = 'pending'
     WHERE customer_reference = ?`,
    [
      refid,
      gateway.tid || null,
      paymentUrl,
      JSON.stringify(gateway),
      customerReference,
    ],
  );

  return {
    payment: publicPayment(
      {
        status: "pending",
        customer_reference: customerReference,
        gateway_refid: refid,
        amount: order.total,
        currency: "RWF",
        pmethod,
        payment_url: paymentUrl,
      },
      {
        message:
          pmethod === "cc"
            ? "Continue on the secure card page to finish payment."
            : "Approve the Mobile Money prompt on your phone to complete payment.",
        reply: gateway.reply || null,
      },
    ),
    items,
  };
}

async function sendPaidEmails(bundle, tx) {
  if (!isMailConfigured()) {
    console.warn("SMTP is not configured - skipping receipt and owner emails.");
    return { receiptSent: false, ownerNotified: false };
  }

  const settings = await getSettingsMap();
  const businessName = settings.company_name || "Palm Pizza Kitchen";
  const customerEmail = bundle.order.customer_email || "";
  const pdf = await buildOrderReceiptPdf({
    businessName,
    businessAddress: settings.address || "Kigali, Rwanda",
    businessPhone: settings.phone || "",
    businessEmail:
      settings.email || getKitchenInbox() || process.env.SMTP_USER || "",
    orderId: bundle.order.id,
    transactionId: tx.gateway_tid || tx.gateway_refid || tx.customer_reference,
    reference: tx.customer_reference,
    customerName: bundle.order.customer_name,
    customerEmail,
    customerPhone: bundle.order.phone,
    address: bundle.order.address,
    items: bundle.items,
    subtotal: Number(bundle.order.subtotal),
    deliveryFee: Number(bundle.order.delivery_fee),
    total: Number(bundle.order.total),
    paymentMethod: bundle.order.payment_method,
    paymentMethodLabel: paymentMethodLabel(bundle.order.payment_method),
    paymentDate: bundle.order.paid_at || new Date().toISOString(),
  });

  let receiptSent = Boolean(tx.receipt_sent);
  if (customerEmail && !receiptSent) {
    const itemLines = bundle.items
      .map(
        (item) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(item.name)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${Math.round(item.unitPrice * item.quantity).toLocaleString("en-RW")} RWF</td></tr>`,
      )
      .join("");
    const fulfillLine = isPickupOrder(bundle.order)
      ? "Pickup at Palm Pizza Kitchen"
      : `Delivering to: ${escapeHtml(bundle.order.address)}`;

    await sendMail({
      to: customerEmail,
      subject: `Your Palm Pizza receipt - ${bundle.order.id}`,
      text: `Hi ${bundle.order.customer_name}, your payment for ${bundle.order.id} was successful. Total: ${Math.round(bundle.order.total).toLocaleString("en-RW")} RWF. Your PDF receipt is attached.`,
      html: `
        <div style="font-family:Nunito,Arial,sans-serif;background:#f7f4ef;padding:28px 12px;">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #e8dfd4;">
            <div style="background:linear-gradient(135deg,#1a1512,#e31837);padding:24px;color:#fff;">
              <p style="margin:0;font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.8;">Palm Pizza Kitchen</p>
              <h1 style="margin:8px 0 0;font-size:26px;">Payment received</h1>
            </div>
            <div style="padding:24px;color:#1c1917;">
              <p>Hi ${escapeHtml(bundle.order.customer_name.split(" ")[0] || "there")},</p>
              <p style="color:#6b635b;">Thank you - your order <strong>${escapeHtml(bundle.order.id)}</strong> is paid and the kitchen has been notified. Your receipt is attached as a PDF.</p>
              <p style="font-size:22px;font-weight:800;margin:16px 0;">${Math.round(bundle.order.total).toLocaleString("en-RW")} RWF</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">${itemLines}</table>
              <p style="margin-top:20px;color:#6b635b;">${fulfillLine}</p>
            </div>
          </div>
        </div>`,
      attachments: [
        {
          filename: `Palm-Pizza-Receipt-${bundle.order.id}.pdf`,
          content: pdf,
          contentType: "application/pdf",
        },
      ],
    });
    receiptSent = true;
  }

  let ownerNotified = Boolean(tx.owner_notified);
  const ownerEmail = getKitchenInbox();
  if (ownerEmail && !ownerNotified) {
    const pickup = isPickupOrder(bundle.order);
    const itemText = bundle.items
      .map(
        (item) =>
          `${item.name} ×${item.quantity} (${Math.round(item.unitPrice * item.quantity).toLocaleString("en-RW")} RWF)`,
      )
      .join("\n");
    const itemRows = bundle.items
      .map(
        (item) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(item.name)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${Math.round(item.unitPrice).toLocaleString("en-RW")} RWF</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${Math.round(item.unitPrice * item.quantity).toLocaleString("en-RW")} RWF</td></tr>`,
      )
      .join("");
    const fulfillLabel = pickup ? "Pickup at the kitchen" : "Deliver to";
    const fulfillValue = pickup
      ? "Customer will collect at Palm Pizza Kitchen"
      : bundle.order.address || "-";
    await sendMail({
      to: ownerEmail,
      subject: `New paid order ${bundle.order.id} - ${bundle.order.customer_name}`,
      text: `New paid order ${bundle.order.id}

Who ordered
Name: ${bundle.order.customer_name}
Phone: ${bundle.order.phone}
Email: ${customerEmail || "-"}

${fulfillLabel}: ${fulfillValue}
Notes: ${bundle.order.notes || "-"}

Items:
${itemText}

Subtotal: ${Math.round(bundle.order.subtotal).toLocaleString("en-RW")} RWF
Delivery: ${Math.round(bundle.order.delivery_fee).toLocaleString("en-RW")} RWF
Total: ${Math.round(bundle.order.total).toLocaleString("en-RW")} RWF
Payment: ${paymentMethodLabel(bundle.order.payment_method)} (${tx.customer_reference})

PDF receipt is attached.`,
      html: `
        <div style="font-family:Nunito,Arial,sans-serif;background:#f7f4ef;padding:28px 12px;">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #e8dfd4;">
            <div style="background:#1c1917;padding:24px;color:#fff;">
              <p style="margin:0;font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.8;">Kitchen alert · info@palmpizzakitchen.com</p>
              <h1 style="margin:8px 0 0;font-size:24px;">New paid order</h1>
            </div>
            <div style="padding:24px;color:#1c1917;">
              <p style="margin:0 0 12px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8a8178;">Who ordered</p>
              <p><strong>Name:</strong> ${escapeHtml(bundle.order.customer_name)}</p>
              <p><strong>Phone:</strong> ${escapeHtml(bundle.order.phone)}</p>
              <p><strong>Email:</strong> ${escapeHtml(customerEmail || "-")}</p>
              <p><strong>${escapeHtml(fulfillLabel)}:</strong> ${escapeHtml(fulfillValue)}</p>
              ${bundle.order.notes ? `<p><strong>Notes:</strong> ${escapeHtml(bundle.order.notes)}</p>` : ""}
              <p style="margin:20px 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8a8178;">Food ordered</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr style="color:#8a8178;font-size:12px;">
                  <th style="text-align:left;padding-bottom:6px;">Item</th>
                  <th style="text-align:center;padding-bottom:6px;">Qty</th>
                  <th style="text-align:right;padding-bottom:6px;">Unit</th>
                  <th style="text-align:right;padding-bottom:6px;">Line</th>
                </tr>
                ${itemRows}
              </table>
              <p style="margin-top:16px;">Subtotal ${Math.round(bundle.order.subtotal).toLocaleString("en-RW")} RWF · Delivery ${Math.round(bundle.order.delivery_fee).toLocaleString("en-RW")} RWF</p>
              <p style="font-size:20px;font-weight:800;">${Math.round(bundle.order.total).toLocaleString("en-RW")} RWF</p>
              <p>Paid via ${escapeHtml(paymentMethodLabel(bundle.order.payment_method))} · Ref ${escapeHtml(tx.customer_reference)}</p>
              <p style="color:#6b635b;font-size:13px;">Receipt PDF is attached for the kitchen copy.</p>
            </div>
          </div>
        </div>`,
      attachments: [
        {
          filename: `Palm-Pizza-Order-${bundle.order.id}.pdf`,
          content: pdf,
          contentType: "application/pdf",
        },
      ],
    });
    ownerNotified = true;
  }

  return { receiptSent, ownerNotified };
}

export async function findPaymentTransactionByRefs(values) {
  const refs = [...new Set((values || []).map((v) => String(v || "").trim()).filter(Boolean))];
  for (const ref of refs) {
    const rows = await query(
      `SELECT * FROM payment_transactions
       WHERE customer_reference = ? OR gateway_refid = ? OR gateway_tid = ?
       ORDER BY id DESC LIMIT 1`,
      [ref, ref, ref],
    );
    if (rows.length) return rows[0];
    if (ref.startsWith("PALM-")) {
      const orderId = ref.split("-").slice(1, 3).join("-");
      const byOrder = await query(
        `SELECT * FROM payment_transactions WHERE order_id = ? ORDER BY id DESC LIMIT 1`,
        [orderId],
      );
      if (byOrder.length) return byOrder[0];
    }
  }
  return null;
}

export async function markOrderFailed(orderId, tx, payload = null) {
  if (tx?.id) {
    await query(
      `UPDATE payment_transactions SET status = 'failed', gateway_payload = COALESCE(?, gateway_payload) WHERE id = ?`,
      [payload ? JSON.stringify(payload) : null, tx.id],
    );
  }
  await query(
    `UPDATE orders SET payment_status = 'failed' WHERE id = ? AND payment_status != 'paid'`,
    [orderId],
  );
}

export async function markOrderPaid(orderId, tx, payload = null) {
  const bundle = await loadOrderBundle(orderId);
  if (!bundle) return { payment: null };

  await query(
    `UPDATE orders
     SET payment_status = 'paid', paid_at = COALESCE(paid_at, NOW()), status = IF(status = 'Cancelled', status, 'Pending')
     WHERE id = ?`,
    [orderId],
  );
  await query(
    `UPDATE payment_transactions SET status = 'paid', gateway_payload = COALESCE(?, gateway_payload) WHERE id = ?`,
    [payload ? JSON.stringify(payload) : null, tx.id],
  );

  if (bundle.order.user_id) {
    await query(`DELETE FROM cart_items WHERE user_id = ?`, [bundle.order.user_id]);
  }

  const refreshed = await latestTransaction(orderId);
  let flags = {
    receiptSent: Boolean(refreshed?.receipt_sent),
    ownerNotified: Boolean(refreshed?.owner_notified),
  };
  try {
    flags = await sendPaidEmails(
      { ...bundle, order: { ...bundle.order, paid_at: new Date().toISOString() } },
      refreshed || tx,
    );
    await query(
      `UPDATE payment_transactions SET receipt_sent = ?, owner_notified = ? WHERE id = ?`,
      [flags.receiptSent ? 1 : 0, flags.ownerNotified ? 1 : 0, tx.id],
    );
  } catch (error) {
    console.error("Paid-order email failed:", error.message);
  }

  return {
    payment: publicPayment({ ...(refreshed || tx), status: "paid" }, flags),
  };
}

export async function syncOrderPayment(orderId, { reference } = {}) {
  const bundle = await loadOrderBundle(orderId);
  if (!bundle) {
    const err = new Error("Order not found.");
    err.status = 404;
    throw err;
  }

  let tx;
  if (reference) {
    const rows = await query(
      `SELECT * FROM payment_transactions WHERE order_id = ? AND (customer_reference = ? OR gateway_refid = ?)`,
      [orderId, reference, reference],
    );
    tx = rows[0];
  } else {
    tx = await latestTransaction(orderId);
  }

  if (!tx) {
    return {
      orderId,
      orderStatus: bundle.order.status,
      payment: { status: bundle.order.payment_status || "unpaid" },
    };
  }

  if (tx.status === "paid" || bundle.order.payment_status === "paid") {
    if (tx.status !== "paid") {
      await markOrderPaid(orderId, tx);
    } else if (!tx.receipt_sent || !tx.owner_notified) {
      await markOrderPaid(orderId, tx);
    }
    const latest = await latestTransaction(orderId);
    return {
      orderId,
      orderStatus: "Pending",
      payment: publicPayment({ ...latest, status: "paid" }),
    };
  }

  const lookup = await resolveCollectionStatusForTransaction(tx);
  const nextStatus = mapCollectionStatusToPayment(
    lookup.gatewayStatus,
    lookup.payload,
  );

  if (lookup.payload) {
    await query(
      `UPDATE payment_transactions
       SET gateway_payload = ?, gateway_refid = COALESCE(gateway_refid, ?)
       WHERE id = ?`,
      [JSON.stringify(lookup.payload), lookup.refid || tx.gateway_refid, tx.id],
    );
  }

  if (nextStatus === "paid") {
    const result = await markOrderPaid(orderId, tx, lookup.payload);
    return {
      orderId,
      orderStatus: "Pending",
      payment: result.payment,
    };
  }

  if (nextStatus === "failed") {
    await query(
      `UPDATE payment_transactions SET status = 'failed' WHERE id = ?`,
      [tx.id],
    );
    await query(
      `UPDATE orders SET payment_status = 'failed' WHERE id = ? AND payment_status != 'paid'`,
      [orderId],
    );
  }

  return {
    orderId,
    orderStatus: bundle.order.status,
    payment: publicPayment({ ...tx, status: nextStatus }),
  };
}
