import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { query } from "../db.js";
import { authRequired, signToken } from "../middleware/auth.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../mail.js";
import { isValidRwandaMobile, normalizeRwandaPhone } from "../services/xentriPayService.js";

const router = Router();
const APP_URL = (
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://palmpizzakitchen.com"
).replace(/\/$/, "");

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

function expiryMinutes(minutes = 30) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    emailVerified: Boolean(row.email_verified),
  };
}

async function assignVerification(userId, email, name) {
  const code = makeCode();
  const token = makeToken();
  const expires = expiryMinutes(30);

  await query(
    `UPDATE users
     SET verify_code = ?, verify_token = ?, verify_expires_at = ?, email_verified = 0
     WHERE id = ?`,
    [code, token, expires, userId],
  );

  const verifyUrl = `${APP_URL}/verify?email=${encodeURIComponent(email)}&token=${token}`;
  await sendVerificationEmail({ to: email, name, code, verifyUrl });
  return { code, token, verifyUrl };
}

async function assignPasswordReset(userId, email, name) {
  const code = makeCode();
  const token = makeToken();
  const expires = expiryMinutes(30);

  await query(
    `UPDATE users
     SET reset_code = ?, reset_token = ?, reset_expires_at = ?
     WHERE id = ?`,
    [code, token, expires, userId],
  );

  const resetUrl = `${APP_URL}/account/reset-password?email=${encodeURIComponent(email)}&token=${token}`;
  await sendPasswordResetEmail({ to: email, name, code, resetUrl });
  return { code, token, resetUrl };
}

function isExpired(value) {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
      return res.status(400).json({
        error: "Name, valid email, and password (8+ chars) are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let phoneValue = null;
    if (phone?.trim()) {
      const local = normalizeRwandaPhone(phone);
      phoneValue = isValidRwandaMobile(local) ? local : phone.trim();
    }

    const existing = await query(`SELECT id, email_verified FROM users WHERE email = ?`, [
      normalizedEmail,
    ]);
    if (existing.length) {
      if (!existing[0].email_verified) {
        try {
          await assignVerification(
            existing[0].id,
            normalizedEmail,
            name.trim(),
          );
        } catch (mailErr) {
          return res.status(502).json({
            error: `Account exists but email could not be sent: ${mailErr.message}`,
            requiresVerification: true,
            email: normalizedEmail,
          });
        }
        return res.status(200).json({
          requiresVerification: true,
          email: normalizedEmail,
          message: "We sent a new verification code to your email.",
        });
      }
      return res.status(409).json({ error: "Email is already registered." });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, phone, email_verified)
       VALUES (?, ?, ?, 'customer', ?, 0)`,
      [name.trim(), normalizedEmail, hash, phoneValue],
    );

    if (phoneValue || normalizedEmail) {
      await query(
        `UPDATE orders
         SET user_id = ?,
             customer_email = COALESCE(NULLIF(customer_email, ''), ?)
         WHERE user_id IS NULL
           AND (
             LOWER(TRIM(customer_email)) = ?
             OR (
               ? IS NOT NULL
               AND REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '')
                 = REPLACE(REPLACE(REPLACE(?, ' ', ''), '-', ''), '+', '')
             )
           )`,
        [
          result.insertId,
          normalizedEmail,
          normalizedEmail,
          phoneValue,
          phoneValue,
        ],
      );
    }

    try {
      await assignVerification(result.insertId, normalizedEmail, name.trim());
    } catch (mailErr) {
      return res.status(201).json({
        requiresVerification: true,
        email: normalizedEmail,
        message:
          "Account created, but the verification email failed to send. Use Resend on the verify page.",
        mailError: mailErr.message,
      });
    }

    res.status(201).json({
      requiresVerification: true,
      email: normalizedEmail,
      message: "Check your inbox for a verification code.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const rows = await query(
      `SELECT id, name, email, password_hash, role, phone, email_verified
       FROM users WHERE email = ?`,
      [email.trim().toLowerCase()],
    );
    if (!rows.length) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const row = rows[0];
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!row.email_verified && row.role !== "admin") {
      return res.status(403).json({
        error: "Please verify your email before signing in.",
        requiresVerification: true,
        email: row.email,
        message:
          "Your account is not verified yet. Check your inbox for the 6-digit code or request a new one.",
      });
    }

    const user = publicUser(row);
    res.json({ token: signToken(user), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const { email, code, token } = req.body || {};
    if (!email?.trim()) {
      return res.status(400).json({ error: "Email is required." });
    }
    if (!code?.trim() && !token?.trim()) {
      return res.status(400).json({ error: "Enter the code from your email." });
    }

    const rows = await query(
      `SELECT id, name, email, role, phone, email_verified, verify_code, verify_token, verify_expires_at
       FROM users WHERE email = ?`,
      [email.trim().toLowerCase()],
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Account not found." });
    }

    const row = rows[0];
    if (row.email_verified) {
      const user = publicUser(row);
      return res.json({
        ok: true,
        alreadyVerified: true,
        message: "Your email is already verified. Signing you in…",
        token: signToken(user),
        user,
      });
    }

    if (isExpired(row.verify_expires_at)) {
      return res.status(410).json({
        error: "This verification code expired. Tap Resend code for a new one.",
        expired: true,
        email: row.email,
      });
    }

    const codeOk =
      code &&
      String(code).trim() === String(row.verify_code || "").trim();
    const tokenOk =
      token &&
      String(token).trim() === String(row.verify_token || "").trim();

    if (!codeOk && !tokenOk) {
      return res.status(400).json({
        error: "That code does not match. Check your email or request a new code.",
        invalidCode: true,
      });
    }

    await query(
      `UPDATE users
       SET email_verified = 1,
           verify_code = NULL,
           verify_token = NULL,
           verify_expires_at = NULL
       WHERE id = ?`,
      [row.id],
    );

    const user = publicUser({ ...row, email_verified: 1 });
    res.json({
      ok: true,
      message: "Email verified. Welcome to Palm Pizza Club!",
      token: signToken(user),
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email?.trim()) {
      return res.status(400).json({ error: "Email is required." });
    }

    const rows = await query(
      `SELECT id, name, email, email_verified FROM users WHERE email = ?`,
      [email.trim().toLowerCase()],
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Account not found." });
    }
    if (rows[0].email_verified) {
      return res.json({ ok: true, message: "Account is already verified." });
    }

    try {
      await assignVerification(rows[0].id, rows[0].email, rows[0].name);
    } catch (mailErr) {
      return res.status(502).json({
        error: `Could not send email: ${mailErr.message}`,
      });
    }

    res.json({
      ok: true,
      message: "A new verification code was sent to your email.",
      email: rows[0].email,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Enter the email on your account." });
    }

    const rows = await query(
      `SELECT id, name, email, email_verified FROM users WHERE email = ?`,
      [email],
    );
    if (!rows.length) {
      return res.json({
        ok: true,
        message:
          "If an account exists with that email, password reset instructions were sent.",
      });
    }

    const row = rows[0];
    if (!row.email_verified) {
      try {
        await assignVerification(row.id, row.email, row.name);
      } catch (mailErr) {
        return res.status(502).json({
          error: `This account is not verified yet and we could not send email: ${mailErr.message}`,
          requiresVerification: true,
          email: row.email,
        });
      }
      return res.status(403).json({
        error: "Verify your email first, then you can reset your password.",
        requiresVerification: true,
        email: row.email,
        message: "We sent a new verification code to your inbox.",
      });
    }

    try {
      await assignPasswordReset(row.id, row.email, row.name);
    } catch (mailErr) {
      return res.status(502).json({
        error: `Could not send reset email: ${mailErr.message}`,
      });
    }

    res.json({
      ok: true,
      email: row.email,
      message: "Password reset instructions were sent to your email.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || "").trim();
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }
    if (!code && !token) {
      return res.status(400).json({
        error: "Enter the reset code from your email or open the reset link.",
      });
    }
    if (password.length < 8) {
      return res.status(400).json({
        error: "Choose a new password with at least 8 characters.",
      });
    }

    const rows = await query(
      `SELECT id, name, email, role, phone, email_verified, reset_code, reset_token, reset_expires_at
       FROM users WHERE email = ?`,
      [email],
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Account not found." });
    }

    const row = rows[0];
    if (!row.email_verified) {
      return res.status(403).json({
        error: "Verify your email before resetting your password.",
        requiresVerification: true,
        email: row.email,
      });
    }

    if (isExpired(row.reset_expires_at)) {
      return res.status(410).json({
        error: "This reset link expired. Request a new password reset email.",
        expired: true,
        email: row.email,
      });
    }

    const codeOk = code && code === String(row.reset_code || "").trim();
    const tokenOk = token && token === String(row.reset_token || "").trim();
    if (!codeOk && !tokenOk) {
      return res.status(400).json({
        error: "That reset code is invalid. Check your email or request a new reset link.",
        invalidCode: true,
      });
    }

    const hash = await bcrypt.hash(password, 10);
    await query(
      `UPDATE users
       SET password_hash = ?,
           reset_code = NULL,
           reset_token = NULL,
           reset_expires_at = NULL
       WHERE id = ?`,
      [hash, row.id],
    );

    const user = publicUser(row);
    res.json({
      ok: true,
      message: "Password updated. You can sign in with your new password.",
      token: signToken(user),
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/change-password", authRequired, async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");
    if (!currentPassword || newPassword.length < 8) {
      return res.status(400).json({
        error: "Enter your current password and a new one (8+ characters).",
      });
    }

    const rows = await query(
      `SELECT id, password_hash FROM users WHERE id = ? LIMIT 1`,
      [req.user.id],
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Account not found." });
    }

    const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE users SET password_hash = ? WHERE id = ?`, [
      hash,
      req.user.id,
    ]);

    res.json({ ok: true, message: "Password updated." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/me", authRequired, async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, name, email, role, phone, email_verified, created_at
       FROM users WHERE id = ?`,
      [req.user.id],
    );
    if (!rows.length) return res.status(404).json({ error: "User not found." });
    res.json({
      user: {
        ...rows[0],
        emailVerified: Boolean(rows[0].email_verified),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
