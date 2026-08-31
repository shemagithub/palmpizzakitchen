export type OrderNotesMeta = {
  paymentHint: string;
  area: string;
  landmark: string;
  place: string;
  gps: string;
  accuracyMeters: number | null;
  fulfillment: "pickup" | "delivery" | "";
  extra: string[];
};

export function parseOrderNotes(notes?: string | null): OrderNotesMeta {
  const raw = String(notes || "");
  const parts = raw
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);

  const meta: OrderNotesMeta = {
    paymentHint: "",
    area: "",
    landmark: "",
    place: "",
    gps: "",
    accuracyMeters: null,
    fulfillment: "",
    extra: [],
  };

  for (const part of parts) {
    if (part.startsWith("pay:")) {
      meta.paymentHint = part.slice(4).trim();
    } else if (part.startsWith("area:")) {
      meta.area = part.slice(5).trim();
    } else if (part.startsWith("landmark:")) {
      meta.landmark = part.slice(9).trim();
    } else if (part.startsWith("place:")) {
      meta.place = part.slice(6).trim();
    } else if (part.startsWith("fulfillment:")) {
      const value = part.slice(12).trim().toLowerCase();
      meta.fulfillment = value === "pickup" ? "pickup" : "delivery";
    } else if (part.startsWith("live-gps:") || part.startsWith("gps:")) {
      const payload = part.includes("live-gps:")
        ? part.slice("live-gps:".length)
        : part.slice(4);
      const [coordsPart, accPart] = payload.split("|acc:");
      meta.gps = coordsPart.trim();
      if (accPart) {
        const match = accPart.match(/(\d+)/);
        if (match) meta.accuracyMeters = Number(match[1]);
      }
    } else {
      meta.extra.push(part);
    }
  }

  return meta;
}

export function parseGpsPair(gps: string): { lat: number; lng: number } | null {
  const [latRaw, lngRaw] = gps.split(",").map((v) => v.trim());
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function googleMapsUrl(input: {
  gps?: string;
  address?: string;
  area?: string;
  landmark?: string;
  place?: string;
}): string | null {
  const coords = input.gps ? parseGpsPair(input.gps) : null;
  if (coords) {
    return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  }

  const query = [
    input.address,
    input.landmark,
    input.area,
    input.place,
    "Kigali, Rwanda",
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");

  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function hasLiveLocation(meta: OrderNotesMeta, fulfillment?: string) {
  if (fulfillment === "pickup") return false;
  return Boolean(parseGpsPair(meta.gps));
}
