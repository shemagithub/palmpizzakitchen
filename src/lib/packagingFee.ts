import type { Fulfillment } from "@/lib/cart";

export function asFeeAmount(value: unknown): number {
  const n = Math.round(Number(value) || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function packagingFeeFor(
  settings: {
    packaging_fee_pickup?: string;
    packaging_fee_delivery?: string;
  },
  fulfillment: Fulfillment,
): number {
  return asFeeAmount(
    fulfillment === "pickup"
      ? settings.packaging_fee_pickup
      : settings.packaging_fee_delivery,
  );
}
