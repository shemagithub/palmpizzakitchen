/**
 * XentriPay Collections, Checkout, Payouts & Webhooks
 * @see XentriPay API docs + Webhooks Integration Guide
 */

import crypto from "crypto";

const REQUEST_TIMEOUT_MS = Number(process.env.XENTRIPAY_TIMEOUT_MS) || 25000;

export const TELECOM_PROVIDER_IDS = {
  mtn: "63510",
  airtel: "63514",
  spenn: "63509",
};

export const BANK_PROVIDER_IDS = {
  bk: "040",
  equity: "192",
  bpr: "400",
  boa: "900",
  access: "115",
  ecobank: "100",
  gt: "070",
  ncb: "025",
};

export function getXentriPayConfig() {
  const apiBase = (
    process.env.XENTRIPAY_API_BASE || "https://xentripay.com"
  ).replace(/\/$/, "");
  const apiKey = (process.env.XENTRIPAY_API_KEY || "").trim();
  const webhookSecret = (process.env.XENTRIPAY_WEBHOOK_SECRET || "").trim();
  const isLive =
    /xentripay\.com$/i.test(apiBase.replace(/^https?:\/\//, "").split("/")[0]) &&
    !apiBase.includes("merchant.test");
  return {
    apiBase,
    apiKey,
    webhookSecret,
    isLive,
    businessEmail:
      process.env.XENTRIPAY_BUSINESS_EMAIL ||
      process.env.SMTP_USER ||
      "orders@palmpizza.com",
    businessName:
      process.env.XENTRIPAY_BUSINESS_NAME || "Palm Pizza Kitchen",
    isConfigured: Boolean(apiKey),
  };
}

export function normalizeRwandaPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("250") && digits.length >= 12) {
    return `0${digits.slice(3, 12)}`;
  }
  if (
    digits.startsWith("25") &&
    !digits.startsWith("250") &&
    digits.length === 11
  ) {
    return `0${digits.slice(2, 11)}`;
  }
  if (digits.startsWith("7") && digits.length === 9) return `0${digits}`;
  if (digits.startsWith("0")) return digits.slice(0, 10);
  return digits.slice(0, 10);
}

export function normalizeRwandaPhoneForApi(phone) {
  const local = normalizeRwandaPhone(phone);
  if (local.startsWith("0") && local.length >= 10) {
    return `250${local.slice(1)}`;
  }
  return local;
}

export function isValidRwandaMobile(phone) {
  const local = normalizeRwandaPhone(phone);
  return /^07\d{8}$/.test(local);
}

export function resolveCollectionAmountRwf(amount) {
  const value = Math.round(Number(amount) || 0);
  if (!Number.isFinite(value) || value < 100) {
    const err = new Error("The minimum payment amount is 100 RWF.");
    err.status = 400;
    throw err;
  }
  return value;
}

export function resolveCollectionPaymentMethod(method) {
  const key = String(method || "momo").toLowerCase();
  if (["card", "cc", "visa", "mastercard"].includes(key)) return "cc";
  return "momo";
}

export function resolveCollectionPhone(phone, method = "momo") {
  const pmethod = resolveCollectionPaymentMethod(method);
  const raw = String(phone || "").trim();
  const local = normalizeRwandaPhone(raw);

  if (pmethod === "momo") {
    if (!raw) {
      const err = new Error("Phone number is required for mobile money.");
      err.status = 400;
      throw err;
    }
    if (!isValidRwandaMobile(local)) {
      const err = new Error(
        "Enter a valid Rwanda mobile number (10 digits, e.g. 0781234567).",
      );
      err.status = 400;
      throw err;
    }
    return local;
  }

  return isValidRwandaMobile(local) ? local : "0780000000";
}

export function assertCollectionInitiateSuccess(data) {
  if (!data || typeof data !== "object") {
    const err = new Error("Empty response from XentriPay.");
    err.status = 502;
    throw err;
  }
  const okSuccess =
    data.success === true || data.success === 1 || data.success === "1";
  const okRetcode =
    data.retcode === undefined ||
    data.retcode === null ||
    data.retcode === 0 ||
    data.retcode === "0";
  if (!okSuccess || !okRetcode) {
    const err = new Error(
      data.message ||
        data.reply ||
        "XentriPay could not start this payment. Please try again.",
    );
    err.status = 400;
    err.data = data;
    throw err;
  }
}

export function extractCollectionGatewayStatus(payload) {
  if (!payload || typeof payload !== "object") return null;
  const candidates = [
    payload.status,
    payload.paymentStatus,
    payload.data?.status,
    payload.collection?.status,
  ];
  for (const value of candidates) {
    if (value !== undefined && value !== null && String(value).trim()) {
      return value;
    }
  }
  return null;
}

export function isLikelyInitiateResponse(payload) {
  if (!payload || typeof payload !== "object") return false;
  const explicitStatus = String(payload.status || "").toUpperCase();
  if (["SUCCESS", "SUCCESSFUL", "COMPLETED", "PAID"].includes(explicitStatus)) {
    return false;
  }
  if (payload.url && String(payload.url).startsWith("http")) return true;
  if (payload.success === true || payload.success === 1) return true;
  return false;
}

export function isCollectionPayloadPaid(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (isLikelyInitiateResponse(payload)) return false;
  const s = String(extractCollectionGatewayStatus(payload) || "").toUpperCase();
  return ["SUCCESS", "SUCCESSFUL", "COMPLETED", "PAID", "APPROVED"].includes(s);
}

export function mapCollectionStatusToPayment(gatewayStatus, payload = null) {
  if (payload && isLikelyInitiateResponse(payload)) return "pending";
  if (isCollectionPayloadPaid(payload)) return "paid";

  const s = String(gatewayStatus || "").toUpperCase();
  if (["SUCCESS", "SUCCESSFUL", "COMPLETED", "PAID"].includes(s)) return "paid";
  if (["FAILED", "FAILURE", "CANCELLED", "REJECTED", "DECLINED"].includes(s)) {
    return "failed";
  }
  return "pending";
}

export function resolveCollectionRefid(gatewayResponse, customerReference) {
  return (
    gatewayResponse?.refid ||
    gatewayResponse?.refId ||
    gatewayResponse?.rid ||
    customerReference ||
    null
  );
}

export function extractCollectionPaymentUrl(data) {
  const candidates = [
    data?.url,
    data?.paymentUrl,
    data?.redirectUrl,
    data?.gatewayUrl,
    data?.checkoutUrl,
  ];
  for (const candidate of candidates) {
    const url = String(candidate || "").trim();
    if (/^https?:\/\//i.test(url)) return url;
  }
  return null;
}

function sanitizeOrigin(raw, fallback) {
  let value = String(raw || fallback || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
  if (!value) value = fallback;
  if (!/^https?:\/\//i.test(value)) value = `http://${value}`;
  const parsed = new URL(value);
  return parsed.origin;
}

function publicizeOrigin(origin) {
  const parsed = new URL(origin);
  if (["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    parsed.hostname = "127.0.0.1.nip.io";
  }
  return parsed.origin;
}

function isAllowedRedirectUrl(url) {
  try {
    const parsed = new URL(String(url || ""));
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    if (!parsed.hostname || parsed.hostname.includes(" ")) return false;
    return true;
  } catch {
    return false;
  }
}

export function getCardCheckoutUrls({ orderId, refid, reference } = {}) {
  const configuredRedirect = String(
    process.env.XENTRIPAY_REDIRECT_URL || "",
  ).trim();
  const appOrigin = publicizeOrigin(
    sanitizeOrigin(process.env.APP_URL, "http://localhost:3000"),
  );
  const backendOrigin = publicizeOrigin(
    sanitizeOrigin(
      process.env.BACKEND_PUBLIC_URL,
      `http://localhost:${process.env.PORT || 4000}`,
    ),
  );

  let redirectUrl = configuredRedirect.replace(/\/$/, "");
  if (!redirectUrl) {
    redirectUrl = new URL("/payment/return", `${appOrigin}/`).toString();
  }

  const callback = new URL(
    "/api/payments/xentripay/callback",
    `${backendOrigin}/`,
  );

  return {
    redirectUrl,
    returnUrl: callback.toString(),
  };
}

async function xentriPayRequest(method, path, { body } = {}) {
  const config = getXentriPayConfig();
  if (!config.isConfigured) {
    const err = new Error(
      "XentriPay is not configured. Set XENTRIPAY_API_KEY in backend/.env",
    );
    err.status = 503;
    throw err;
  }

  const url = `${config.apiBase}${path.startsWith("/") ? path : `/${path}`}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-XENTRIPAY-KEY": config.apiKey,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const gatewayMessage =
        data.message || data.error || data.reply || `XentriPay HTTP ${res.status}`;
      const err = new Error(gatewayMessage);
      err.data = data;
      if (res.status === 401 || res.status === 403) {
        err.status = 502;
        err.message =
          "XentriPay rejected the API key for this environment. Use the live key with https://xentripay.com.";
      } else {
        err.status = res.status >= 500 ? 502 : res.status;
      }
      throw err;
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      const err = new Error("XentriPay request timed out.");
      err.status = 504;
      throw err;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function initiateCollection({
  email,
  cname,
  amount,
  phone,
  pmethod = "momo",
  chargesIncluded = true,
  redirectUrl,
  returnUrl,
  customerReference,
  details,
}) {
  const config = getXentriPayConfig();
  const resolvedMethod = resolveCollectionPaymentMethod(pmethod);
  const localPhone = resolveCollectionPhone(phone, resolvedMethod);
  const amountInt = resolveCollectionAmountRwf(amount);

  const body = {
    email: (email || config.businessEmail).trim(),
    cname: (cname || "Customer").trim().slice(0, 120),
    amount: amountInt,
    currency: "RWF",
    pmethod: resolvedMethod,
    chargesIncluded: Boolean(chargesIncluded),
    cnumber: localPhone,
    msisdn: normalizeRwandaPhoneForApi(localPhone),
  };

  if (customerReference) {
    body.customerRef = String(customerReference);
    body.details = details || `Order ${customerReference}`;
  }

  if (resolvedMethod === "cc") {
    const redirect = String(redirectUrl || "").trim();
    const ret = String(returnUrl || "").trim();
    if (!isAllowedRedirectUrl(redirect)) {
      const err = new Error(
        "Card payments need a valid return URL. Set APP_URL in backend/.env to a full http(s) address.",
      );
      err.status = 503;
      throw err;
    }
    // Live XentriPay rejects localhost (no TLD). Use a public-looking absolute URL.
    body.redirecturl = redirect;
    body.redirectUrl = redirect;
    body.redirectionUrl = redirect;
    if (isAllowedRedirectUrl(ret)) {
      body.returl = ret;
      body.returnUrl = ret;
    }
  }

  const response = await xentriPayRequest("POST", "/api/collections/initiate", {
    body,
  });
  assertCollectionInitiateSuccess(response);
  return response;
}

export async function getCollectionStatus(refid) {
  return xentriPayRequest(
    "GET",
    `/api/collections/status/${encodeURIComponent(refid)}`,
  );
}

export async function createCheckoutSession({ amount, customerFinalUrl }) {
  return xentriPayRequest("POST", "/api/checkout/sessions", {
    body: {
      amount: resolveCollectionAmountRwf(amount),
      currency: "RWF",
      customerFinalUrl,
    },
  });
}

export async function payCheckoutSession(sessionId, payload) {
  return xentriPayRequest(
    "POST",
    `/api/checkout/sessions/${encodeURIComponent(sessionId)}/pay`,
    { body: payload },
  );
}

export async function getCheckoutSessionStatus(refid) {
  return xentriPayRequest(
    "GET",
    `/api/checkout/sessions/status/${encodeURIComponent(refid)}`,
  );
}

function extractValidatedAccountName(payload) {
  if (!payload || typeof payload !== "object") return "";
  const nested = payload.data && typeof payload.data === "object" ? payload.data : {};
  const candidates = [
    payload.validatedAccountName,
    payload.accountHolderName,
    payload.accountName,
    payload.account_name,
    payload.customerName,
    payload.registeredName,
    payload.beneficiaryName,
    payload.name,
    nested.validatedAccountName,
    nested.accountHolderName,
    nested.accountName,
    nested.account_name,
    nested.customerName,
    nested.beneficiaryName,
    nested.name,
  ];
  const skip = new Set([
    "PAYOUT",
    "SUCCESS",
    "PENDING",
    "RECIPIENT",
    "LOOKUP",
    "NAME",
    "OK",
  ]);
  for (const value of candidates) {
    const name = cleanExtractedName(value);
    if (!name) continue;
    if (skip.has(name.toUpperCase())) continue;
    return name;
  }
  return extractRegisteredNameFromMessage(
    collectGatewayMessages(payload).join(" | "),
  );
}

function cleanExtractedName(value) {
  let name = String(value || "")
    .replace(/\\+"/g, '"')
    .replace(/["'}]+$/g, "")
    .replace(/[."']+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // Drop trailing JSON / punctuation leftovers from stringified payloads
  name = name.replace(/\s*[}\]]+\s*$/g, "").trim();
  if (!name) return "";
  if (/^recipient$/i.test(name)) return "";
  if (/^(success|pending|failed|error|ok|null)$/i.test(name)) return "";
  if (/^0\d{9}$/.test(name) || /^\d+$/.test(name)) return "";
  return name.slice(0, 120);
}

export function collectGatewayMessages(payload) {
  const out = [];
  const walk = (value, depth = 0) => {
    if (value == null || depth > 5) return;
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (text) out.push(text);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }
    if (typeof value === "object") {
      for (const key of [
        "message",
        "error",
        "reply",
        "statusMessage",
        "detail",
        "details",
        "title",
        "raw",
        "description",
      ]) {
        if (value[key] != null) walk(value[key], depth + 1);
      }
    }
  };
  walk(payload);
  return [...new Set(out)];
}

export function extractRegisteredNameFromMessage(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const patterns = [
    /correct\s+registered\s+name\s+is\s*:?\s*['"]?(.+?)['"]?(?:\.|$|\||,)/i,
    /correct\s+registered\s+name\s+is\s*:?\s*(.+)$/i,
    /registered\s+name\s+is\s*:?\s*['"]?(.+?)['"]?(?:\.|$|\||,)/i,
    /registered\s+name\s+is\s*:?\s*(.+)$/i,
    /validated\s+account\s+name\s+is\s*:?\s*['"]?(.+?)['"]?(?:\.|$|\||,)/i,
    /validated\s+account\s+name\s+is\s*:?\s*(.+)$/i,
    /registered\s+name\s*:?\s*['"]?(.+?)['"]?(?:\.|$|\||,)/i,
    /expected\s*(?:name)?\s*:?\s*['"]?(.+?)['"]?(?:\.|$|\||,)/i,
    /account\s+holder\s*(?:name)?\s*:?\s*['"]?(.+?)['"]?(?:\.|$|\||,)/i,
    /beneficiary\s+name\s*:?\s*['"]?(.+?)['"]?(?:\.|$|\||,)/i,
    /name\s+(?:does\s+not\s+match|mismatch).*?['"]([^'"]+)['"]/i,
    /should\s+be\s*:?\s*['"]?(.+?)['"]?(?:\.|$|\||,)/i,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (!match?.[1]) continue;
    const name = cleanExtractedName(match[1]);
    if (name) return name;
  }
  return "";
}

export function assertPayoutInitiated(data) {
  if (!data || typeof data !== "object") {
    const err = new Error("Empty response from XentriPay.");
    err.status = 502;
    throw err;
  }
  const status = String(data.status || "").toUpperCase();
  if (["FAILED", "FAILURE", "REVERSED"].includes(status)) {
    const err = new Error(
      data.statusMessage ||
        data.message ||
        "XentriPay rejected this payout request.",
    );
    err.status = 400;
    err.data = data;
    throw err;
  }
  return data;
}

export function detectTelecomProviderId(msisdn) {
  const local = normalizeRwandaPhone(msisdn);
  // Rwanda: Airtel 072/073 · MTN 078/079
  if (/^07[23]\d{7}$/.test(local)) return TELECOM_PROVIDER_IDS.airtel;
  if (/^07[89]\d{7}$/.test(local)) return TELECOM_PROVIDER_IDS.mtn;
  return "";
}

function resolveNameFromGatewayFailure(error) {
  const messages = collectGatewayMessages({
    message: error?.message,
    ...(error?.data && typeof error.data === "object" ? error.data : {}),
  });
  const joined = messages.join(" | ");
  return (
    extractRegisteredNameFromMessage(joined) ||
    extractValidatedAccountName(error?.data || {}) ||
    ""
  );
}

function humanizePayoutGatewayError(error) {
  const messages = collectGatewayMessages({
    message: error?.message,
    ...(error?.data && typeof error.data === "object" ? error.data : {}),
  });
  const joined = messages.join(" ").toLowerCase();
  const suggestedName = resolveNameFromGatewayFailure(error);
  if (suggestedName && /registered|name|match|holder|beneficiary/.test(joined)) {
    return `The MoMo registered name is "${suggestedName}". Click Validate name again, then confirm that exact name before sending.`;
  }
  if (/insufficient|not enough|low balance|balance/.test(joined)) {
    return "Not enough XentriPay wallet balance for this payout. Collect more payments or top up the merchant wallet.";
  }
  if (/otp|authori[sz]e|confirm/.test(joined) && /pending|await/.test(joined)) {
    return error?.message || messages[0] || "Confirm the OTP on the business XentriPay account.";
  }
  if (/invalid.*provider|unknown.*provider|telecom/.test(joined)) {
    return "Wrong mobile network for this number. MTN uses 078/079, Airtel uses 072/073.";
  }
  if (/duplicate|already exists|customerreference/i.test(joined)) {
    return "That payout reference was already used. Click Validate name again.";
  }
  if (/msisdn|phone|number|cnumber/.test(joined)) {
    return "Enter a valid Rwanda mobile number in local format (10 digits, e.g. 0788302208).";
  }
  if (/amount|minimum|100/.test(joined)) {
    return "Payout amount must be at least 100 RWF.";
  }
  return (
    error?.message ||
    messages.find((m) => !/^xentripay http/i.test(m)) ||
    "XentriPay could not process this payout."
  );
}

function buildPayoutRequestBody({
  customerReference,
  telecomProviderId,
  msisdn,
  name,
  amount,
  currency = "RWF",
}) {
  const local = normalizeRwandaPhone(msisdn);
  const detected = detectTelecomProviderId(local);
  const providerId = String(
    detected || telecomProviderId || TELECOM_PROVIDER_IDS.mtn,
  );
  const payoutAmount = Math.max(1, Math.round(Number(amount) || 0));
  const accountName = String(name || "").trim();
  if (!isValidRwandaMobile(local)) {
    const err = new Error(
      "Enter a valid Rwanda mobile number (10 digits, e.g. 0788302208).",
    );
    err.status = 400;
    throw err;
  }
  if (payoutAmount < 100) {
    const err = new Error("Amount must be at least 100 RWF.");
    err.status = 400;
    throw err;
  }
  if (!accountName) {
    const err = new Error("Recipient name is required for payouts.");
    err.status = 400;
    throw err;
  }
  return {
    customerReference,
    telecomProviderId: providerId,
    msisdn: local,
    name: accountName,
    transactionType: "PAYOUT",
    currency,
    amount: payoutAmount,
    localMsisdn: local,
    providerId,
    payoutAmount,
    accountName,
  };
}

export async function lookupPayoutAccount({
  telecomProviderId,
  msisdn,
  amount,
}) {
  const built = buildPayoutRequestBody({
    customerReference: `LOOKUP-${Date.now()}`,
    telecomProviderId,
    msisdn,
    name: "Account Holder",
    amount,
  });
  const { localMsisdn: local, providerId, payoutAmount } = built;

  try {
    const customerReference = `PAY-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const data = await createPayoutRaw({
      customerReference,
      telecomProviderId: providerId,
      msisdn: local,
      name: built.accountName,
      amount: payoutAmount,
    });
    assertPayoutInitiated(data);
    const name =
      extractValidatedAccountName(data) ||
      extractRegisteredNameFromMessage(
        collectGatewayMessages(data).join(" | "),
      );
    if (!name) {
      const err = new Error(
        data.statusMessage ||
          data.message ||
          "XentriPay did not return the registered MoMo name for this number.",
      );
      err.status = 400;
      err.data = data;
      throw err;
    }
    return {
      lookupAvailable: true,
      initiated: true,
      name,
      msisdn: local,
      telecomProviderId: providerId,
      customerReference,
      amount: payoutAmount,
      gateway: {
        ...data,
        validatedAccountName: name,
      },
      status: mapPayoutStatusToInternal(data.status),
      statusMessage:
        data.statusMessage ||
        `Registered MoMo name: ${name}. Confirm it is the right person, then click Confirm payout and approve the OTP XentriPay sends to the business account.`,
    };
  } catch (error) {
    const name = resolveNameFromGatewayFailure(error);
    if (name) {
      return {
        lookupAvailable: true,
        initiated: false,
        name,
        msisdn: local,
        telecomProviderId: providerId,
        customerReference: null,
        amount: payoutAmount,
        gateway: error.data || {},
        status: "validated",
        statusMessage: `Registered MoMo name: ${name}. Confirm it is the right person, then click Confirm payout. XentriPay will send an OTP to the business account to approve it.`,
      };
    }
    const err = new Error(humanizePayoutGatewayError(error));
    err.status = error.status || 400;
    err.data = error.data;
    throw err;
  }
}

async function createPayoutRaw({
  customerReference,
  telecomProviderId,
  msisdn,
  name,
  amount,
  currency = "RWF",
}) {
  const built = buildPayoutRequestBody({
    customerReference,
    telecomProviderId,
    msisdn,
    name,
    amount,
    currency,
  });
  return xentriPayRequest("POST", "/api/payment-requests", {
    body: {
      customerReference: built.customerReference,
      telecomProviderId: built.providerId,
      msisdn: built.localMsisdn,
      name: built.accountName,
      transactionType: "PAYOUT",
      currency: built.currency || currency,
      amount: built.payoutAmount,
    },
  });
}

export async function submitPayout({
  customerReference,
  telecomProviderId,
  msisdn,
  name,
  amount,
  currency = "RWF",
}) {
  const built = buildPayoutRequestBody({
    customerReference:
      customerReference ||
      `PAY-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    telecomProviderId,
    msisdn,
    name,
    amount,
    currency,
  });

  const attemptNames = [built.accountName];
  const attemptProviders = [built.providerId];
  const alternateProvider =
    built.providerId === TELECOM_PROVIDER_IDS.mtn
      ? TELECOM_PROVIDER_IDS.airtel
      : TELECOM_PROVIDER_IDS.mtn;
  if (!detectTelecomProviderId(built.localMsisdn)) {
    attemptProviders.push(alternateProvider);
  }

  let lastError = null;
  for (const providerId of attemptProviders) {
    for (const accountName of attemptNames) {
      const ref =
        attemptNames.length > 1 || attemptProviders.length > 1
          ? `PAY-${Date.now()}-${Math.floor(Math.random() * 9999)}`
          : built.customerReference;
      try {
        const data = await createPayoutRaw({
          customerReference: ref,
          telecomProviderId: providerId,
          msisdn: built.localMsisdn,
          name: accountName,
          amount: built.payoutAmount,
          currency,
        });
        assertPayoutInitiated(data);
        return {
          ...data,
          customerReference: ref,
          telecomProviderId: providerId,
          msisdn: built.localMsisdn,
          submittedName: accountName,
          amount: built.payoutAmount,
        };
      } catch (error) {
        lastError = error;
        const suggested = resolveNameFromGatewayFailure(error);
        if (
          suggested &&
          !attemptNames.some(
            (value) => value.toLowerCase() === suggested.toLowerCase(),
          )
        ) {
          attemptNames.push(suggested);
          continue;
        }
      }
    }
  }

  const err = new Error(humanizePayoutGatewayError(lastError));
  err.status = lastError?.status || 400;
  err.data = lastError?.data;
  throw err;
}

export async function createPayout(params) {
  try {
    return await submitPayout(params);
  } catch (error) {
    throw error;
  }
}

export async function getPayoutStatus(customerRef) {
  return xentriPayRequest(
    "GET",
    `/api/payment-requests/check-status?customerRef=${encodeURIComponent(customerRef)}`,
  );
}

function walletListFromPayload(data) {
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.wallets)) return data.wallets;
  if (Array.isArray(data)) return data;
  if (data?.walletId || data?.balance != null) return [data];
  return [];
}

function configuredWalletId() {
  return String(process.env.XENTRIPAY_WALLET_ID || "").trim();
}

function businessNameNeedle() {
  return String(process.env.XENTRIPAY_BUSINESS_NAME || "Palm Pizza Kitchen")
    .replace(/^['"]|['"]$/g, "")
    .trim()
    .toLowerCase();
}

function extractWalletBalance(row) {
  if (!row || typeof row !== "object") return null;
  const candidates = [
    row.balance,
    row.availableBalance,
    row.available,
    row.walletBalance,
    row.data?.balance,
  ];
  for (const value of candidates) {
    const amount = Number(value);
    if (Number.isFinite(amount)) return amount;
  }
  return null;
}

function matchMerchantWallets(list) {
  const walletId = configuredWalletId();
  if (walletId) {
    return list.filter(
      (row) =>
        String(row.walletId) === walletId ||
        String(row.businessAccountId) === walletId ||
        String(row.id) === walletId,
    );
  }

  const needle = businessNameNeedle();
  if (!needle) return [];

  const exact = list.filter(
    (row) => String(row.businessName || "").trim().toLowerCase() === needle,
  );
  if (exact.length) return exact;

  const tokens = needle.split(/\s+/).filter((part) => part.length > 2);
  return list.filter((row) => {
    const name = String(row.businessName || "").trim().toLowerCase();
    if (!name) return false;
    if (name.includes(needle) || needle.includes(name)) return true;
    return tokens.some((token) => name.includes(token));
  });
}

function walletRowToBalance(row, config) {
  const balance = extractWalletBalance(row);
  if (balance == null) return null;
  return {
    available: true,
    live: Boolean(config.isLive),
    currency: row.currency || "RWF",
    balance,
    businessName: row.businessName || config.businessName,
    walletId: row.walletId ?? row.businessAccountId ?? row.id ?? null,
    active: row.active !== false,
    source: "xentripay",
  };
}

async function listMerchantWallets() {
  const wallets = [];
  const seen = new Set();

  for (let page = 0; page < 20; page += 1) {
    const data = await xentriPayRequest(
      "GET",
      `/api/wallets?size=200&page=${page}`,
    );
    const list = walletListFromPayload(data);
    if (!list.length) break;

    for (const row of list) {
      const key = String(
        row.walletId ?? row.businessAccountId ?? row.id ?? row.businessName ?? "",
      );
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      wallets.push(row);
    }

    const total = Number(data.totalElements ?? data.total ?? 0);
    if (total && wallets.length >= total) break;
    if (list.length < 200) break;
  }

  return wallets;
}

export async function getMerchantBalance() {
  const config = getXentriPayConfig();
  const walletId = configuredWalletId();

  if (walletId) {
    try {
      const one = await xentriPayRequest(
        "GET",
        `/api/wallets/${encodeURIComponent(walletId)}`,
      );
      const row = walletListFromPayload(one)[0] || one;
      const wallet = walletRowToBalance(row, config);
      if (wallet) return wallet;
    } catch {
      /* fall through to wallet list */
    }
  }

  try {
    const all = await listMerchantWallets();
    const matches = matchMerchantWallets(all);
    const row =
      matches.find(
        (wallet) =>
          extractWalletBalance(wallet) != null && wallet.active !== false,
      ) || matches[0];
    const wallet = walletRowToBalance(row, config);
    if (wallet) return wallet;
  } catch (error) {
    return {
      available: false,
      balance: null,
      error: error.message || "Could not load XentriPay wallet balance.",
      source: "xentripay",
    };
  }

  return null;
}

export function mapPayoutStatusToInternal(status) {
  const s = String(status || "").toUpperCase();
  if (["SUCCESS", "SUCCESSFUL", "COMPLETED"].includes(s)) return "completed";
  if (["FAILED", "FAILURE", "REVERSED"].includes(s)) return "failed";
  return "pending";
}

export function verifyXentriPayWebhookSignature(rawBody, receivedSignature, secret) {
  if (!secret || receivedSignature == null) return false;
  const raw =
    Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ""), "utf8");
  const expectedHex = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const expected = `sha256=${expectedHex}`;
  const received = String(receivedSignature).trim();
  const candidates = received.startsWith("sha256=")
    ? [received]
    : [received, `sha256=${received}`];

  return candidates.some((candidate) => {
    const a = Buffer.from(candidate, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  });
}

export async function resolveCollectionStatusForTransaction(tx) {
  const candidates = [
    tx?.gateway_refid,
    tx?.customer_reference,
    tx?.internal_ref,
  ]
    .map((v) => (v ? String(v).trim() : ""))
    .filter(Boolean);

  let last = { paymentStatus: "pending", gatewayStatus: null, payload: null };

  for (const refid of [...new Set(candidates)]) {
    try {
      const payload = await getCollectionStatus(refid);
      const gatewayStatus = extractCollectionGatewayStatus(payload);
      const paymentStatus = mapCollectionStatusToPayment(gatewayStatus, payload);
      last = { refid, gatewayStatus, payload, paymentStatus };
      if (paymentStatus === "paid" || isCollectionPayloadPaid(payload)) {
        return { ...last, paymentStatus: "paid" };
      }
    } catch (error) {
      last.lookupError = error.message;
    }
  }

  return last;
}
