import { formatPrice } from "@/data/menu";

type ShopRulesSettings = {
  accepting_orders?: string;
  min_order?: string;
  kitchen_note?: string;
};

export function minOrderAmount(settings: ShopRulesSettings) {
  return Math.max(0, Math.round(Number(settings.min_order) || 0));
}

export function isAcceptingOrders(settings: ShopRulesSettings) {
  return settings.accepting_orders !== "0";
}

export function orderBlockReason(
  subtotal: number,
  settings: ShopRulesSettings,
): string {
  if (!isAcceptingOrders(settings)) {
    return settings.kitchen_note?.trim()
      ? settings.kitchen_note.trim()
      : "The kitchen is not accepting orders right now. Please try again later.";
  }
  const min = minOrderAmount(settings);
  if (min > 0 && subtotal < min) {
    return `Minimum order is ${formatPrice(min)}. Add more items to reach the minimum.`;
  }
  return "";
}
