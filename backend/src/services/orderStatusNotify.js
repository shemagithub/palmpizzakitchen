import { isMailConfigured, sendMail } from "../mail.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appUrl() {
  return String(process.env.APP_URL || "https://palmpizzakitchen.com").replace(
    /\/$/,
    "",
  );
}

function isPickupOrder(order) {
  return (
    String(order?.notes || "").includes("fulfillment:pickup") ||
    /pickup/i.test(String(order?.address || ""))
  );
}

/** Customer-facing copy for kitchen status changes. */
export function orderStatusEmailCopy(status, { pickup = false } = {}) {
  const map = {
    Pending: {
      headline: "Order received",
      title: pickup
        ? "Your order is paid and waiting for the kitchen"
        : "Your order is paid and in the kitchen queue",
      body: pickup
        ? "We have your order. The kitchen will start preparing it shortly. We’ll email you again when it’s ready for pickup."
        : "We have your order. The kitchen will start preparing it shortly. We’ll email you again when it’s on the way.",
    },
    Preparing: {
      headline: "Being prepared",
      title: "The kitchen is preparing your order",
      body: pickup
        ? "Your food is being made now. We’ll let you know when it’s ready to collect."
        : "Your food is being made now. We’ll let you know when the rider is on the way.",
    },
    "Out for delivery": {
      headline: pickup ? "Ready for pickup" : "On the way",
      title: pickup
        ? "Your order is ready for pickup"
        : "Your order is out for delivery",
      body: pickup
        ? "Please come collect your order at Palm Pizza Kitchen. Bring your order number."
        : "A rider is bringing your order to the delivery address you gave at checkout.",
    },
    Delivered: {
      headline: pickup ? "Collected" : "Delivered",
      title: pickup
        ? "Thanks — hope you enjoy your meal"
        : "Your order has been delivered",
      body: pickup
        ? "We marked this order as collected. Thanks for ordering from Palm Pizza Kitchen."
        : "We marked this order as delivered. Thanks for ordering from Palm Pizza Kitchen. Bon appétit!",
    },
    Cancelled: {
      headline: "Cancelled",
      title: "Your order was cancelled",
      body: "This order was cancelled by the kitchen. If you already paid and need help, reply to this email or contact Palm Pizza Kitchen with your order number.",
    },
  };
  return (
    map[status] || {
      headline: status,
      title: `Order update: ${status}`,
      body: `Your order status is now “${status}”.`,
    }
  );
}

/**
 * Email the customer when kitchen status changes.
 * Never throws to the caller — returns { sent, skipped?, error? }.
 */
export async function notifyCustomerOrderStatus(order, nextStatus) {
  const email = String(order?.customer_email || "").trim().toLowerCase();
  if (!email) {
    return { sent: false, skipped: "no_email" };
  }
  if (!isMailConfigured()) {
    console.warn(
      "SMTP is not configured - skipping order status email for",
      order?.id,
    );
    return { sent: false, skipped: "smtp_not_configured" };
  }

  const previous = String(order?.status || "");
  if (previous === nextStatus) {
    return { sent: false, skipped: "unchanged" };
  }

  const pickup = isPickupOrder(order);
  const copy = orderStatusEmailCopy(nextStatus, { pickup });
  const firstName =
    String(order.customer_name || "there").trim().split(/\s+/)[0] || "there";
  const trackUrl = `${appUrl()}/orders/`;
  const orderId = String(order.id || "");
  const total = Math.round(Number(order.total) || 0).toLocaleString("en-RW");

  const subject = `${copy.headline}: ${orderId} · Palm Pizza Kitchen`;
  const text = `Hi ${firstName},

${copy.title}

${copy.body}

Order: ${orderId}
Total: ${total} RWF
${pickup ? "Fulfillment: Pickup" : `Delivery: ${order.address || ""}`}

Track your order: ${trackUrl}

— Palm Pizza Kitchen
`;

  const html = `
  <div style="font-family:Nunito,Arial,sans-serif;background:#f7f4ef;padding:28px 12px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #e8dfd4;">
      <div style="background:linear-gradient(135deg,#1a1512,#e31837);padding:24px;color:#fff;">
        <p style="margin:0;font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.8;">Palm Pizza Kitchen</p>
        <h1 style="margin:8px 0 0;font-size:26px;">${escapeHtml(copy.headline)}</h1>
      </div>
      <div style="padding:24px;color:#1c1917;">
        <p style="margin:0 0 12px;font-size:16px;">Hi ${escapeHtml(firstName)},</p>
        <p style="margin:0 0 8px;font-size:18px;font-weight:800;">${escapeHtml(copy.title)}</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#6b635b;">${escapeHtml(copy.body)}</p>
        <div style="background:#f7f4ef;border-radius:16px;padding:16px;margin:0 0 20px;">
          <p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a8178;">Order</p>
          <p style="margin:0;font-size:18px;font-weight:800;">${escapeHtml(orderId)}</p>
          <p style="margin:10px 0 0;font-size:14px;color:#6b635b;">Total · ${total} RWF</p>
          <p style="margin:6px 0 0;font-size:14px;color:#6b635b;">
            ${
              pickup
                ? "Pickup at Palm Pizza Kitchen"
                : `Delivering to: ${escapeHtml(order.address || "")}`
            }
          </p>
          <p style="margin:10px 0 0;font-size:13px;">
            Status: <strong>${escapeHtml(nextStatus)}</strong>
          </p>
        </div>
        <div style="text-align:center;margin:8px 0 4px;">
          <a href="${escapeHtml(trackUrl)}" style="display:inline-block;background:#e31837;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;">
            Track my order
          </a>
        </div>
        <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#8a8178;">
          If you have questions, reply to this email and include your order number.
        </p>
      </div>
    </div>
  </div>`;

  try {
    await sendMail({ to: email, subject, text, html });
    return { sent: true };
  } catch (err) {
    console.error(
      "Order status email failed:",
      orderId,
      nextStatus,
      err.message,
    );
    return { sent: false, error: err.message };
  }
}
