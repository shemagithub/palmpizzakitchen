/** Default Kigali delivery sectors — used when no custom list is saved yet. */
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
] as const;

export type KigaliDeliveryArea = (typeof KIGALI_DELIVERY_AREAS)[number];

export type DeliveryAreaFee = {
  area: string;
  fee: number;
};

export function normalizeAreaName(name: unknown): string {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function defaultDeliveryAreaFees(fallbackFee = 1500): DeliveryAreaFee[] {
  const base = Math.max(0, Math.round(Number(fallbackFee) || 0));
  return KIGALI_DELIVERY_AREAS.map((area) => ({ area, fee: base }));
}

export function parseDeliveryAreaFees(
  raw: unknown,
  fallbackFee = 1500,
): DeliveryAreaFee[] {
  const base = Math.max(0, Math.round(Number(fallbackFee) || 0));

  if (!raw || (typeof raw === "string" && !raw.trim())) {
    return defaultDeliveryAreaFees(base);
  }

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return defaultDeliveryAreaFees(base);
    }
  }

  const rows: DeliveryAreaFee[] = [];
  const seen = new Set<string>();

  const pushRow = (areaRaw: unknown, feeRaw: unknown) => {
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
      pushRow(
        (row as { area?: unknown }).area,
        (row as { fee?: unknown }).fee,
      );
    }
  } else if (parsed && typeof parsed === "object") {
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (key === "default") continue;
      pushRow(key, value);
    }
  }

  if (!rows.length) return defaultDeliveryAreaFees(base);
  return rows;
}

export function serializeDeliveryAreaFees(rows: DeliveryAreaFee[]): string {
  const normalized: DeliveryAreaFee[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const area = normalizeAreaName(row.area);
    const key = area.toLowerCase();
    if (!area || seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      area,
      fee: Math.max(0, Math.round(Number(row.fee) || 0)),
    });
  }

  return JSON.stringify(normalized);
}

export function resolveDeliveryFeeForArea(
  areaFees: DeliveryAreaFee[],
  area: string,
  fallbackFee = 1500,
): number {
  const key = String(area || "").trim();
  if (!key) return 0;
  const found = areaFees.find(
    (row) => row.area.toLowerCase() === key.toLowerCase(),
  );
  if (found) return found.fee;
  return Math.max(0, Math.round(Number(fallbackFee) || 0));
}

export function minDeliveryFee(
  areaFees: DeliveryAreaFee[],
  fallbackFee = 1500,
): number {
  const values = areaFees
    .map((row) => row.fee)
    .filter((fee) => Number.isFinite(fee) && fee >= 0);
  if (!values.length) return Math.max(0, Math.round(Number(fallbackFee) || 0));
  return Math.min(...values);
}

export function maxDeliveryFee(areaFees: DeliveryAreaFee[]): number {
  const values = areaFees
    .map((row) => row.fee)
    .filter((fee) => Number.isFinite(fee) && fee >= 0);
  return values.length ? Math.max(...values) : 0;
}
