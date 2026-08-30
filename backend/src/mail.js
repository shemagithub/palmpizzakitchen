import "./loadEnv.js";
import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "palmpizzakitchen.com";
const port = Number(process.env.SMTP_PORT || 465);
const user = process.env.SMTP_USER || "";
const pass = String(process.env.SMTP_PASS || "").replace(/^['"]|['"]$/g, "");
const from =
  process.env.SMTP_FROM ||
  (user ? `Palm Pizza Kitchen <${user}>` : "Palm Pizza Kitchen <info@palmpizzakitchen.com>");
const secure =
  process.env.SMTP_SECURE === "true" ||
  process.env.SMTP_SECURE === "1" ||
  port === 465;

function createTransport() {
  if (!user || !pass) {
    throw new Error(
      "Email is not configured. Set SMTP_USER and SMTP_PASS in backend/.env",
    );
  }
  const ip = process.env.IMAP_IP || process.env.MAIL_SERVER_IP || "68.65.123.100";
  const useHost = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ? host : ip;
  return nodemailer.createTransport({
    host: useHost,
    port,
    secure,
    auth: { user, pass },
    tls: {
      minVersion: "TLSv1.2",
      servername: host && !/^\d/.test(host) ? host : "palmpizzakitchen.com",
    },
  });
}

export async function sendVerificationEmail({
  to,
  name,
  code,
  verifyUrl,
}) {
  const transport = createTransport();
  const safeName = name?.split(" ")[0] || "there";

  const html = `
  <div style="font-family:Nunito,Arial,sans-serif;background:#f7f4ef;padding:32px 16px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e8dfd4;">
      <div style="background:linear-gradient(135deg,#1a1512,#e31837);padding:28px 24px;color:#fff;">
        <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.8;">Palm Pizza Kitchen</p>
        <h1 style="margin:8px 0 0;font-size:28px;line-height:1.2;">Verify your email</h1>
      </div>
      <div style="padding:28px 24px;color:#1c1917;">
        <p style="margin:0 0 12px;font-size:16px;">Hi ${safeName},</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#6b635b;">
          Thanks for joining Palm Pizza Club. Enter this code on the verification page,
          or tap the button below. The code expires in <strong>30 minutes</strong>.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <div style="display:inline-block;background:#f3ebe3;border-radius:16px;padding:16px 28px;letter-spacing:0.35em;font-size:28px;font-weight:800;color:#e31837;">
            ${code}
          </div>
        </div>
        <div style="text-align:center;margin:28px 0 8px;">
          <a href="${verifyUrl}" style="display:inline-block;background:#e31837;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;">
            Verify my account
          </a>
        </div>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#8a8178;">
          If you didn’t create this account, you can ignore this email.
        </p>
      </div>
    </div>
  </div>`;

  const text = `Hi ${safeName},

Your Palm Pizza Kitchen verification code is: ${code}

Verify here: ${verifyUrl}

This code expires in 30 minutes.`;

  await transport.sendMail({
    from,
    to,
    subject: `${code} is your Palm Pizza verification code`,
    text,
    html,
  });
}

export async function sendPasswordResetEmail({
  to,
  name,
  code,
  resetUrl,
}) {
  const transport = createTransport();
  const safeName = name?.split(" ")[0] || "there";

  const html = `
  <div style="font-family:Nunito,Arial,sans-serif;background:#f7f4ef;padding:32px 16px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e8dfd4;">
      <div style="background:linear-gradient(135deg,#1a1512,#e31837);padding:28px 24px;color:#fff;">
        <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.8;">Palm Pizza Kitchen</p>
        <h1 style="margin:8px 0 0;font-size:28px;line-height:1.2;">Reset your password</h1>
      </div>
      <div style="padding:28px 24px;color:#1c1917;">
        <p style="margin:0 0 12px;font-size:16px;">Hi ${safeName},</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#6b635b;">
          We received a request to reset your Palm Pizza Club password.
          Enter the code below or tap the button. This link expires in
          <strong>30 minutes</strong>.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <div style="display:inline-block;background:#f3ebe3;border-radius:16px;padding:16px 28px;letter-spacing:0.35em;font-size:28px;font-weight:800;color:#e31837;">
            ${code}
          </div>
        </div>
        <div style="text-align:center;margin:28px 0 8px;">
          <a href="${resetUrl}" style="display:inline-block;background:#e31837;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;">
            Choose a new password
          </a>
        </div>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#8a8178;">
          If you did not ask for this, you can ignore this email. Your password will stay the same.
        </p>
      </div>
    </div>
  </div>`;

  const text = `Hi ${safeName},

Your Palm Pizza Kitchen password reset code is: ${code}

Reset here: ${resetUrl}

This code expires in 30 minutes. If you did not request this, ignore this email.`;

  await transport.sendMail({
    from,
    to,
    subject: `${code} — reset your Palm Pizza password`,
    text,
    html,
  });
}

export async function sendMail({ to, subject, html, text, attachments }) {
  if (!to) {
    throw new Error("Email recipient is missing.");
  }
  const transport = createTransport();
  await transport.sendMail({
    from,
    to,
    subject,
    text,
    html,
    attachments,
  });
}

export function isMailConfigured() {
  return Boolean(user && pass);
}

/** Inbox that receives kitchen alerts: who ordered, what they bought, where to send it. */
export function getKitchenInbox() {
  return String(
    process.env.BUSINESS_OWNER_EMAIL || "info@palmpizzakitchen.com",
  )
    .trim()
    .toLowerCase();
}

/** Send from the shop info@ mailbox (admin composer), even if IMAP helper files are missing. */
export async function sendFromShopMailbox({
  to,
  cc,
  bcc,
  subject,
  text,
  html,
  attachments,
}) {
  if (!to?.trim()) throw new Error("Recipient is required.");
  const mailboxUser = String(
    process.env.IMAP_USER || "info@palmpizzakitchen.com",
  ).trim();
  const mailboxPass = String(
    process.env.IMAP_PASS || process.env.MAILBOX_PASS || pass,
  ).replace(/^['"]|['"]$/g, "");
  if (!mailboxPass) {
    throw new Error("Set IMAP_PASS on the API server to send mail.");
  }
  const mailboxHost = process.env.IMAP_IP || process.env.IMAP_HOST || host || "68.65.123.100";
  const mailboxPort = Number(
    process.env.MAILBOX_SMTP_PORT || process.env.SMTP_PORT || 465,
  );
  const display = process.env.MAILBOX_NAME || "Palm Pizza Kitchen";
  const tlsName = process.env.IMAP_TLS_NAME || process.env.IMAP_HOST || "palmpizzakitchen.com";
  const transport = nodemailer.createTransport({
    host: /^\d{1,3}(\.\d{1,3}){3}$/.test(mailboxHost) ? mailboxHost : (process.env.IMAP_IP || "68.65.123.100"),
    port: mailboxPort,
    secure: mailboxPort === 465,
    auth: { user: mailboxUser, pass: mailboxPass },
    tls: { minVersion: "TLSv1.2", servername: tlsName },
  });
  const info = await transport.sendMail({
    from: `${display} <${mailboxUser}>`,
    to: to.trim(),
    cc: cc?.trim() || undefined,
    bcc: bcc?.trim() || undefined,
    subject: subject?.trim() || "(No subject)",
    text: text || "",
    html: html || undefined,
    attachments,
  });
  return { ok: true, messageId: info.messageId };
}
