import { query } from "../db.js";

function asFee(value) {
  const n = Math.round(Number(value) || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function resolvePackagingFee(fulfillment) {
  const rows = await query(
    `SELECT setting_key, setting_value FROM settings
     WHERE setting_key IN ('packaging_fee_pickup', 'packaging_fee_delivery')`,
  );
  const map = Object.fromEntries(
    rows.map((row) => [row.setting_key, row.setting_value]),
  );
  return fulfillment === "pickup"
    ? asFee(map.packaging_fee_pickup)
    : asFee(map.packaging_fee_delivery);
}
