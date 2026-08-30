import { query } from "../db.js";

export const KIGALI_DELIVERY_AREAS = [
  "Remera",
  "Kimironko",
  "Kacyiru",
  "Nyarutarama",
  "Gisozi",
  "Kimihurura",
  "Nyamirambo",
  "Kicukiro",
  "Gikondo",
  "Downtown / CBD",
  "Kanombe",
  "Gaculiro",
  "Other",
];

function normalizeAreaName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ");
}

function defaultAreaFees(fallbackFee) {
  const base = Math.max(0, Math.round(Number(fallbackFee) || 0));
  return KIGALI_DELIVERY_AREAS.map((area) => ({ area, fee: base }));
}

export function parseDeliveryAreaFees(raw, fallbackFee = 1500) {
  const base = Math.max(0, Math.round(Number(fallbackFee) || 0));

  if (!raw || (typeof raw === "string" && !raw.trim())) {
    return defaultAreaFees(base);
  }

  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return defaultAreaFees(base);
    }
  }

  const rows = [];
  const seen = new Set();

  const pushRow = (areaRaw, feeRaw) => {
    const area = normalizeAreaName(areaRaw);
    const key = area.toLowerCase();
    if (!area || seen.has(key)) return;
    seen.add(key);
    rows.push({
      area,
      fee: Math.max(0, Math.round(Number(feeRaw) || 0)),
    });
  };

  if (Array.isArray(parsed)) {
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      pushRow(row.area, row.fee);
    }
  } else if (parsed && typeof parsed === "object") {
    for (const [key, value] of Object.entries(parsed)) {
      if (key === "default") continue;
      pushRow(key, value);
    }
  }

  if (!rows.length) return defaultAreaFees(base);
  return rows;
}

let feeCache = { at: 0, defaultFee: 1500, areaFees: [] };
const CACHE_MS = 30_000;

export async function loadDeliveryFeeSettings() {
  const now = Date.now();
  if (now - feeCache.at < CACHE_MS && feeCache.areaFees.length) {
    return feeCache;
  }

  const rows = await query(
    `SELECT setting_key, setting_value FROM settings
     WHERE setting_key IN ('delivery_fee', 'delivery_area_fees')`,
  );
  const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
  const defaultFee = Math.max(
    0,
    Math.round(Number(map.delivery_fee) || 1500),
  );
  const areaFees = parseDeliveryAreaFees(map.delivery_area_fees, defaultFee);
  feeCache = { at: now, defaultFee, areaFees };
  return feeCache;
}

export function resolveDeliveryFeeFromSettings(settings, area) {
  const key = String(area || "").trim();
  if (!key) return settings.defaultFee;
  const found = settings.areaFees.find(
    (row) => row.area.toLowerCase() === key.toLowerCase(),
  );
  return found ? found.fee : settings.defaultFee;
}

export async function resolveDeliveryFee(area) {
  const settings = await loadDeliveryFeeSettings();
  return resolveDeliveryFeeFromSettings(settings, area);
}

export function extractAreaFromOrderInput(body = {}, notes = "") {
  const direct = String(body.area || "").trim();
  if (direct) return direct;
  const raw = String(notes || "");
  for (const part of raw.split("|")) {
    const trimmed = part.trim();
    if (trimmed.startsWith("area:")) return trimmed.slice(5).trim();
  }
  return "";
}
