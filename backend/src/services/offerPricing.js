import { query } from "../db.js";

const OFFER_TYPES = new Set(["general", "bogo", "fixed_price"]);
const PIZZA_CATEGORIES = new Set(["classic", "cheese", "veggie", "meat"]);

function parseOfferSizePrices(raw) {
  if (raw == null || raw === "") return null;
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;
  const enabled = Boolean(
    data.enabled === true ||
      data.enabled === 1 ||
      data.enabled === "1" ||
      data.enabled === "true",
  );
  if (!enabled) return null;
  const money = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };
  const s = money(data.s ?? data.small);
  const m = money(data.m ?? data.medium);
  const l = money(data.l ?? data.large);
  const flat = money(data.flat ?? data.onePrice);
  if (flat != null && s == null && m == null && l == null) {
    return { enabled: true, flat };
  }
  if (s == null && m == null && l == null) return null;
  return {
    enabled: true,
    ...(flat != null ? { flat } : {}),
    ...(s != null ? { s } : {}),
    ...(m != null ? { m } : {}),
    ...(l != null ? { l } : {}),
  };
}

export function parseEligibleCategories(raw) {
  if (raw == null || raw === "") return [];
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];
  return data.map((c) => String(c || "").trim()).filter(Boolean);
}

export function parseOfferType(raw) {
  const type = String(raw || "general").trim().toLowerCase();
  return OFFER_TYPES.has(type) ? type : "general";
}

export function categoryEligible(category, eligibleCategories) {
  const cat = String(category || "").trim();
  if (!eligibleCategories.length) {
    return PIZZA_CATEGORIES.has(cat) || cat === "burger";
  }
  return eligibleCategories.includes(cat);
}

function sizesFromDetails(details) {
  if (!details) return null;
  let data = details;
  if (typeof details === "string") {
    try {
      data = JSON.parse(details);
    } catch {
      return null;
    }
  }
  const sizes = data?.sizes ?? data;
  return parseOfferSizePrices(sizes);
}

function asSize(raw) {
  const v = String(raw || "").toLowerCase();
  if (v === "s" || v === "small") return "s";
  if (v === "m" || v === "medium") return "m";
  if (v === "l" || v === "large") return "l";
  return "";
}

function sizeWord(size) {
  if (size === "s") return "Small";
  if (size === "l") return "Large";
  return "Medium";
}

export function menuItemUnitPrice(menuRow, sizeRaw) {
  const sizePrices = sizesFromDetails(menuRow.details);
  let size = asSize(sizeRaw);
  if (size && !sizePrices) size = "";
  if (sizePrices && (!size || sizePrices[size] == null)) {
    size =
      sizePrices.m != null
        ? "m"
        : sizePrices.s != null
          ? "s"
          : sizePrices.l != null
            ? "l"
            : "";
  }
  const unit =
    size && sizePrices && sizePrices[size] != null
      ? sizePrices[size]
      : Number(menuRow.price);
  return { unit: Number(unit) || 0, size, sizePrices };
}

export async function loadActiveOffer(offerId) {
  const rows = await query(
    `SELECT id, title, code, status, offer_type, eligible_categories, size_prices
     FROM offers WHERE id = ? LIMIT 1`,
    [offerId],
  );
  if (!rows.length) return { error: "Offer not found." };
  const row = rows[0];
  if (!["Active", "Scheduled"].includes(String(row.status))) {
    return { error: "This offer is not active right now." };
  }
  return {
    offer: {
      id: row.id,
      title: row.title,
      code: row.code,
      offerType: parseOfferType(row.offer_type),
      eligibleCategories: parseEligibleCategories(row.eligible_categories),
      sizePrices: parseOfferSizePrices(row.size_prices),
    },
  };
}

/**
 * Resolve price + display name for a cart line that includes offerBundle metadata.
 */
export function resolveOfferBundleLine(offer, paidRow, freeRow, bundle) {
  const offerType = parseOfferType(offer.offerType || offer.offer_type);
  const eligible = parseEligibleCategories(
    offer.eligibleCategories ?? offer.eligible_categories,
  );
  const sizePrices = parseOfferSizePrices(
    offer.sizePrices ?? offer.size_prices,
  );

  if (!paidRow) {
    return { error: "Paid item not found on the menu." };
  }
  if (!categoryEligible(paidRow.category, eligible)) {
    return { error: `${paidRow.name} is not included in this offer.` };
  }

  const size = asSize(bundle.size);
  const paidPricing = menuItemUnitPrice(paidRow, size);
  const resolvedSize = paidPricing.size;

  if (offerType === "bogo") {
    if (!freeRow) {
      return { error: "Free item not found on the menu." };
    }
    if (!categoryEligible(freeRow.category, eligible)) {
      return { error: `${freeRow.name} is not eligible as the free item.` };
    }

    const freePricing = menuItemUnitPrice(freeRow, size);
    const resolvedSize = paidPricing.size || freePricing.size || asSize(bundle.size);

    if (sizePrices) {
      const opts = [sizePrices.s, sizePrices.m, sizePrices.l].filter(
        (v) => v != null,
      );
      if (opts.length) {
        const pick = asSize(bundle.size) || resolvedSize;
        if (!pick || sizePrices[pick] == null) {
          return {
            error: "Choose a size included in this promo offer.",
          };
        }
      }
    }

    if (freePricing.unit > paidPricing.unit) {
      return {
        error:
          "Free item must be the same menu price or cheaper than the item you pay for.",
      };
    }

    let unitPrice = paidPricing.unit;
    if (sizePrices?.flat != null && sizePrices.s == null && sizePrices.m == null && sizePrices.l == null) {
      unitPrice = sizePrices.flat;
    } else if (sizePrices) {
      const pick = asSize(bundle.size) || resolvedSize;
      if (pick && sizePrices[pick] != null) {
        unitPrice = sizePrices[pick];
      } else {
        unitPrice =
          sizePrices.m ?? sizePrices.s ?? sizePrices.l ?? paidPricing.unit;
      }
    }

    const useFlat =
      sizePrices?.flat != null &&
      sizePrices.s == null &&
      sizePrices.m == null &&
      sizePrices.l == null;
    const paidLabel = useFlat
      ? paidRow.name
      : resolvedSize
        ? `${paidRow.name} (${sizeWord(resolvedSize)})`
        : paidRow.name;
    const freeLabel = useFlat
      ? freeRow.name
      : freePricing.size
        ? `${freeRow.name} (${sizeWord(freePricing.size)})`
        : freeRow.name;
    const lineName = `${offer.title}: ${paidLabel} + ${freeLabel} FREE`;

    return {
      itemId: paidRow.id,
      name: lineName,
      unitPrice,
      quantity: 1,
      size: useFlat ? undefined : resolvedSize || undefined,
      offerCode: offer.code,
    };
  }

  if (offerType === "fixed_price") {
    let unit = paidPricing.unit;
    if (
      sizePrices?.flat != null &&
      sizePrices.s == null &&
      sizePrices.m == null &&
      sizePrices.l == null
    ) {
      unit = sizePrices.flat;
    } else if (sizePrices) {
      const pick = asSize(bundle.size) || resolvedSize;
      const hasOpts = [sizePrices.s, sizePrices.m, sizePrices.l].some(
        (v) => v != null,
      );
      if (hasOpts && (!pick || sizePrices[pick] == null)) {
        return { error: "Choose a size included in this promo offer." };
      }
      if (pick && sizePrices[pick] != null) {
        unit = sizePrices[pick];
      } else {
        unit =
          sizePrices.m ?? sizePrices.s ?? sizePrices.l ?? paidPricing.unit;
      }
    }

    const itemLabel =
      sizePrices?.flat != null &&
      sizePrices.s == null &&
      sizePrices.m == null &&
      sizePrices.l == null
        ? paidRow.name
        : resolvedSize
          ? `${paidRow.name} (${sizeWord(resolvedSize)})`
          : paidRow.name;
    const lineName = `${offer.title}: ${itemLabel}`;

    return {
      itemId: paidRow.id,
      name: lineName,
      unitPrice: unit,
      quantity: 1,
      size: resolvedSize || undefined,
      offerCode: offer.code,
    };
  }

  return { error: "This offer type cannot be ordered online." };
}
