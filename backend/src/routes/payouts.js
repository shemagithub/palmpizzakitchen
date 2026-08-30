import { Router } from "express";
import { query } from "../db.js";
import { adminRequired } from "../middleware/auth.js";
import {
  BANK_PROVIDER_IDS,
  TELECOM_PROVIDER_IDS,
  getMerchantBalance,
  getPayoutStatus,
  getXentriPayConfig,
  isValidRwandaMobile,
  lookupPayoutAccount,
  mapPayoutStatusToInternal,
  normalizeRwandaPhone,
  submitPayout,
} from "../services/xentriPayService.js";
import { getKitchenInbox, isMailConfigured, sendMail } from "../mail.js";

const router = Router();

router.get("/providers", adminRequired, (_req, res) => {
  res.json({
    mobileMoney: [
      { id: TELECOM_PROVIDER_IDS.mtn, name: "MTN Mobile Money" },
      { id: TELECOM_PROVIDER_IDS.airtel, name: "Airtel Rwanda" },
      { id: TELECOM_PROVIDER_IDS.spenn, name: "SPENN" },
    ],
    banks: Object.entries(BANK_PROVIDER_IDS).map(([key, id]) => ({
      id,
      key,
      name: key.toUpperCase(),
    })),
  });
});

router.get("/balance", adminRequired, async (_req, res) => {
  try {
    const config = getXentriPayConfig();
    const collectedRows = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM payment_transactions
       WHERE status = 'paid'`,
    );
    const paidOutRows = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM payouts
       WHERE LOWER(status) IN ('completed', 'successful', 'success')`,
    );
    const reservedRows = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM payouts
       WHERE LOWER(status) IN ('pending')`,
    );

    const collected = Number(collectedRows[0]?.total || 0);
    const paidOut = Number(paidOutRows[0]?.total || 0);
    const reserved = Number(reservedRows[0]?.total || 0);
    const shopBalance = Math.max(0, collected - paidOut - reserved);

    let wallet = null;
    try {
      wallet = await getMerchantBalance();
    } catch {
      wallet = null;
    }

    const usingWallet = Boolean(
      wallet?.available && wallet.balance != null && !wallet.error,
    );
    const displayBalance = usingWallet
      ? Number(wallet.balance)
      : shopBalance;

    res.json({
      ok: true,
      available: true,
      live: Boolean(config.isLive),
      currency: wallet?.currency || "RWF",
      businessName: wallet?.businessName || config.businessName,
      source: usingWallet ? "xentripay" : "collected",
      balance: displayBalance,
      walletBalance: usingWallet ? Number(wallet.balance) : null,
      walletId: wallet?.walletId ?? null,
      collected,
      paidOut,
      reserved,
      shopBalance,
      walletError: wallet?.error || null,
    });
  } catch (err) {
    res.status(err.status === 401 ? 502 : err.status || 500).json({
      ok: false,
      available: false,
      currency: "RWF",
      balance: null,
      error: err.message || "Could not load collected balance.",
    });
  }
});

router.post("/name-check", adminRequired, async (req, res) => {
  try {
    const {
      msisdn,
      amount,
      telecomProviderId = TELECOM_PROVIDER_IDS.mtn,
    } = req.body || {};

    if (!String(msisdn || "").trim()) {
      return res.status(400).json({
        error: "Enter the recipient mobile number first.",
      });
    }
    if (Math.round(Number(amount) || 0) < 100) {
      return res.status(400).json({
        error: "Enter an amount of at least 100 RWF, then validate the name.",
      });
    }

    const result = await lookupPayoutAccount({
      msisdn,
      amount,
      telecomProviderId,
    });

    const gateway = result.gateway || {};
    if (result.initiated && result.customerReference) {
      await query(
        `INSERT INTO payouts
          (customer_reference, internal_ref, amount, currency, recipient_name, msisdn, telecom_provider_id, status, status_message, initiated_by, gateway_payload)
         VALUES (?, ?, ?, 'RWF', ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           recipient_name = VALUES(recipient_name),
           amount = VALUES(amount),
           msisdn = VALUES(msisdn),
           telecom_provider_id = VALUES(telecom_provider_id),
           status = VALUES(status),
           status_message = VALUES(status_message),
           gateway_payload = VALUES(gateway_payload),
           updated_at = CURRENT_TIMESTAMP`,
        [
          result.customerReference,
          gateway.internalRef || null,
          result.amount,
          result.name,
          result.msisdn,
          String(result.telecomProviderId),
          result.status || "pending",
          result.statusMessage,
          req.user.id,
          JSON.stringify(gateway),
        ],
      );
    }

    res.json({
      ok: true,
      lookupAvailable: true,
      nameValidated: true,
      initiated: Boolean(result.initiated),
      name: result.name,
      msisdn: result.msisdn,
      telecomProviderId: result.telecomProviderId,
      customerReference: result.customerReference,
      amount: result.amount,
      statusMessage: result.statusMessage,
    });
  } catch (err) {
    const status = err.status === 401 ? 502 : err.status || 400;
    res.status(status).json({
      error: err.message || "Could not validate this MoMo name.",
      details: err.data || undefined,
    });
  }
});

router.get("/", adminRequired, async (_req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM payouts ORDER BY created_at DESC LIMIT 50`,
    );
    res.json({
      payouts: rows.map((row) => ({
        id: row.id,
        reference: row.customer_reference,
        amount: Number(row.amount),
        currency: row.currency,
        recipientName: row.recipient_name,
        msisdn: row.msisdn,
        providerId: row.telecom_provider_id,
        status: row.status,
        statusMessage: row.status_message,
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", adminRequired, async (req, res) => {
  try {
    const {
      amount,
      recipientName,
      msisdn,
      nameConfirmed,
      customerReference: existingReference,
      telecomProviderId = TELECOM_PROVIDER_IDS.mtn,
    } = req.body || {};

    if (!nameConfirmed) {
      return res.status(400).json({
        error: "Confirm the validated account name before sending the payout.",
      });
    }

    const payoutAmount = Math.round(Number(amount) || 0);
    if (payoutAmount < 100) {
      return res.status(400).json({ error: "Amount must be at least 100 RWF." });
    }

    if (existingReference) {
      const rows = await query(
        `SELECT * FROM payouts WHERE customer_reference = ? LIMIT 1`,
        [existingReference],
      );
      if (rows.length) {
        const row = rows[0];
        if (
          Math.round(Number(row.amount)) !== payoutAmount ||
          normalizeRwandaPhone(row.msisdn) !== normalizeRwandaPhone(msisdn)
        ) {
          return res.status(400).json({
            error:
              "Phone or amount changed after validation. Click Validate name again.",
          });
        }

        let gatewayStatus = row.status;
        let statusMessage =
          row.status_message ||
          "Payout submitted. Confirm the OTP sent to the business XentriPay account.";
        try {
          const gateway = await getPayoutStatus(existingReference);
          gatewayStatus = mapPayoutStatusToInternal(
            gateway?.data?.status || gateway?.status || gateway?.statusMessage,
          );
          statusMessage =
            gateway?.data?.status ||
            gateway?.statusMessage ||
            gateway?.message ||
            statusMessage;
          await query(
            `UPDATE payouts SET status = ?, status_message = ?, gateway_payload = ? WHERE customer_reference = ?`,
            [
              gatewayStatus,
              String(statusMessage),
              JSON.stringify(gateway),
              existingReference,
            ],
          );
        } catch {
          /* keep stored status */
        }

        return res.json({
          ok: true,
          payout: {
            reference: row.customer_reference,
            status: gatewayStatus,
            statusMessage:
              gatewayStatus === "pending"
                ? "Payout is waiting for OTP approval on the business XentriPay account (email or phone registered with XentriPay)."
                : statusMessage,
            amount: Number(row.amount),
            recipientName: row.recipient_name,
            validatedAccountName: row.recipient_name,
            otpRequired: gatewayStatus === "pending",
          },
        });
      }
    }

    if (!recipientName?.trim() || !msisdn?.trim()) {
      return res.status(400).json({
        error: "Validate the mobile number first, then confirm the account name.",
      });
    }
    const localMsisdn = normalizeRwandaPhone(msisdn);
    if (!isValidRwandaMobile(localMsisdn)) {
      return res.status(400).json({
        error: "Enter a valid Rwanda mobile number (10 digits, e.g. 0788302208).",
      });
    }

    const customerReference = `PAY-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const gateway = await submitPayout({
      customerReference,
      telecomProviderId,
      msisdn: localMsisdn,
      name: recipientName.trim(),
      amount: payoutAmount,
    });

    const validatedName =
      gateway.validatedAccountName || gateway.submittedName || recipientName.trim();
    const status = mapPayoutStatusToInternal(gateway.status);
    await query(
      `INSERT INTO payouts
        (customer_reference, internal_ref, amount, currency, recipient_name, msisdn, telecom_provider_id, status, status_message, initiated_by, gateway_payload)
       VALUES (?, ?, ?, 'RWF', ?, ?, ?, ?, ?, ?, ?)`,
      [
        gateway.customerReference || customerReference,
        gateway.internalRef || null,
        payoutAmount,
        validatedName,
        localMsisdn,
        String(gateway.telecomProviderId || telecomProviderId),
        status,
        gateway.statusMessage ||
          "Payout submitted. Confirm the OTP sent to the business XentriPay account.",
        req.user.id,
        JSON.stringify(gateway),
      ],
    );

    if (isMailConfigured()) {
      const ownerEmail = getKitchenInbox();
      if (ownerEmail) {
        await sendMail({
          to: ownerEmail,
          subject: `Payout initiated - ${gateway.customerReference || customerReference}`,
          text: `A payout of ${payoutAmount.toLocaleString("en-RW")} RWF to ${validatedName} (${localMsisdn}) was submitted. Status: ${gateway.status || "PENDING"}. Confirm the OTP from XentriPay to complete it.`,
          html: `<p>A payout of <strong>${payoutAmount.toLocaleString("en-RW")} RWF</strong> to <strong>${validatedName}</strong> (${localMsisdn}) was submitted.</p><p>Reference: ${gateway.customerReference || customerReference}</p><p>Confirm the OTP sent to your XentriPay registered email or phone to complete it.</p>`,
        }).catch((error) => console.error("Payout email failed:", error.message));
      }
    }

    res.status(201).json({
      ok: true,
      payout: {
        reference: gateway.customerReference || customerReference,
        status,
        statusMessage:
          gateway.statusMessage ||
          "Payout submitted. Confirm the OTP sent to the business XentriPay account (email or phone registered with XentriPay).",
        amount: payoutAmount,
        recipientName: validatedName,
        validatedAccountName: gateway.validatedAccountName || validatedName,
        otpRequired: status === "pending",
      },
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.message,
      details: err.data || undefined,
    });
  }
});

router.get("/:reference/status", adminRequired, async (req, res) => {
  try {
    const gateway = await getPayoutStatus(req.params.reference);
    const providerStatus =
      gateway?.data?.status || gateway?.status || gateway?.statusMessage;
    const status = mapPayoutStatusToInternal(providerStatus);
    await query(
      `UPDATE payouts SET status = ?, status_message = ?, gateway_payload = ? WHERE customer_reference = ?`,
      [
        status,
        String(providerStatus || gateway.message || status),
        JSON.stringify(gateway),
        req.params.reference,
      ],
    );
    res.json({ ok: true, status, gateway });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
