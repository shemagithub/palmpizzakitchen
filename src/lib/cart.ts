import { api, getToken } from "@/lib/api";
import type { ComboChoice, MenuItem, ProductSizeId } from "@/data/menu";
import { comboChoicesKey } from "@/data/menu";

export type GuestCartLine = {
  id: string;
  name: string;
  price: number;
  qty: number;
  image: string;
  size?: ProductSizeId;
  comboChoices?: ComboChoice[];
};

const CART_KEY = "palm_guest_cart";
const SNAPSHOT_KEY = "palm_checkout_lines";
const FULFILLMENT_KEY = "palm_fulfillment";

export type Fulfillment = "delivery" | "pickup";

function asSize(value: unknown): ProductSizeId | undefined {
  const raw = String(value || "").toLowerCase();
  if (raw === "s" || raw === "small") return "s";
  if (raw === "m" || raw === "medium") return "m";
  if (raw === "l" || raw === "large") return "l";
  return undefined;
}

function asComboChoices(value: unknown): ComboChoice[] | undefined {
  if (!Array.isArray(value) || !value.length) return undefined;
  const out: ComboChoice[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const slotId = String(r.slotId || "").trim();
    const itemId = String(r.itemId || "").trim();
    const itemName = String(r.itemName || "").trim();
    if (!slotId || !itemId) continue;
    out.push({ slotId, itemId, itemName: itemName || itemId });
  }
  return out.length ? out : undefined;
}

function lineKey(
  line: Pick<GuestCartLine, "id" | "size" | "comboChoices">,
) {
  const sizePart = line.size ? `::${line.size}` : "";
  const comboPart = comboChoicesKey(line.comboChoices);
  const comboSuffix = comboPart ? `::c:${comboPart}` : "";
  return `${line.id}${sizePart}${comboSuffix}`;
}

type RawCartLine = Partial<GuestCartLine> & {
  itemId?: string;
  quantity?: number;
};

export function normalizeCartLine(raw: RawCartLine | null | undefined): GuestCartLine | null {
  if (!raw) return null;
  const id = String(raw.id || raw.itemId || "").trim();
  const qty = Math.max(0, Number(raw.qty ?? raw.quantity) || 0);
  const price = Number(raw.price);
  if (!id || qty <= 0) return null;
  const size = asSize(raw.size);
  const comboChoices = asComboChoices(raw.comboChoices);
  return {
    id,
    name: String(raw.name || "Menu item"),
    price: Number.isFinite(price) ? price : 0,
    qty,
    image: String(raw.image || ""),
    ...(size ? { size } : {}),
    ...(comboChoices ? { comboChoices } : {}),
  };
}

function normalizeLines(raw: unknown): GuestCartLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => normalizeCartLine(row as RawCartLine))
    .filter((row): row is GuestCartLine => Boolean(row));
}

function mergeCartLines(...groups: GuestCartLine[][]): GuestCartLine[] {
  const map = new Map<string, GuestCartLine>();
  for (const group of groups) {
    for (const line of group) {
      const key = lineKey(line);
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { ...line });
        continue;
      }
      map.set(key, {
        id: line.id,
        name: prev.name || line.name,
        image: prev.image || line.image,
        qty: Math.max(prev.qty, line.qty),
        price: prev.price > 0 ? prev.price : line.price,
        ...(prev.size || line.size
          ? { size: prev.size || line.size }
          : {}),
        ...(prev.comboChoices || line.comboChoices
          ? { comboChoices: prev.comboChoices || line.comboChoices }
          : {}),
      });
    }
  }
  return [...map.values()];
}

export function readGuestCart(): GuestCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    return normalizeLines(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeGuestCart(items: GuestCartLine[]) {
  const next = normalizeLines(items);
  localStorage.setItem(CART_KEY, JSON.stringify(next));
  writeCartSnapshot(next);
  window.dispatchEvent(new Event("palm-cart-updated"));
}

export function clearGuestCart() {
  localStorage.removeItem(CART_KEY);
  sessionStorage.removeItem(SNAPSHOT_KEY);
  window.dispatchEvent(new Event("palm-cart-updated"));
}

export function guestCartCount() {
  return readGuestCart().reduce((s, i) => s + i.qty, 0);
}

export function readCartSnapshot(): GuestCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return [];
    return normalizeLines(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeCartSnapshot(items: GuestCartLine[]) {
  if (typeof window === "undefined") return;
  const next = normalizeLines(items);
  if (!next.length) return;
  sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next));
}

export function readFulfillment(): Fulfillment {
  if (typeof window === "undefined") return "delivery";
  return localStorage.getItem(FULFILLMENT_KEY) === "pickup"
    ? "pickup"
    : "delivery";
}

export function writeFulfillment(value: Fulfillment) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FULFILLMENT_KEY, value);
  window.dispatchEvent(new Event("palm-fulfillment-updated"));
}

function sameChoiceLine(
  a: Pick<GuestCartLine, "id" | "size" | "comboChoices">,
  b: Pick<GuestCartLine, "id" | "size" | "comboChoices">,
) {
  return lineKey(a) === lineKey(b);
}

function addLocalLine(
  item: Pick<MenuItem, "id" | "name" | "price" | "image">,
  qty: number,
  options?: { size?: ProductSizeId; comboChoices?: ComboChoice[] },
) {
  const size = options?.size;
  const comboChoices = asComboChoices(options?.comboChoices);
  const cart = readGuestCart();
  const existing = cart.find((c) =>
    sameChoiceLine(c, { id: item.id, size, comboChoices }),
  );
  if (existing) {
    existing.qty += qty;
    existing.price = Number(item.price) || existing.price;
    existing.name = item.name || existing.name;
    existing.image = item.image || existing.image;
    if (size) existing.size = size;
    if (comboChoices) existing.comboChoices = comboChoices;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: Number(item.price) || 0,
      qty,
      image: item.image,
      ...(size ? { size } : {}),
      ...(comboChoices ? { comboChoices } : {}),
    });
  }
  writeGuestCart(cart);
}

/** Add item for guest (local) or signed-in user (API, with local fallback). */
export async function addToCart(
  item: Pick<MenuItem, "id" | "name" | "price" | "image">,
  quantity = 1,
  options?: { size?: ProductSizeId; comboChoices?: ComboChoice[] },
) {
  const qty = Math.max(1, quantity);
  const size = options?.size;
  const comboChoices = asComboChoices(options?.comboChoices);
  const hasLocalOnly = Boolean(size || comboChoices?.length);

  if (getToken() && !hasLocalOnly) {
    try {
      await api("/cart", {
        method: "POST",
        body: JSON.stringify({ itemId: item.id, quantity: qty }),
      });
      const server = await fetchServerCart();
      writeCartSnapshot(mergeCartLines(server, readGuestCart(), [
        {
          id: item.id,
          name: item.name,
          price: Number(item.price) || 0,
          qty,
          image: item.image,
        },
      ]));
      window.dispatchEvent(new Event("palm-cart-updated"));
      return;
    } catch {
      addLocalLine(item, qty);
      return;
    }
  }

  addLocalLine(item, qty, { size, comboChoices });
}

async function fetchServerCart(): Promise<GuestCartLine[]> {
  const data = await api<{ items?: unknown[] }>("/cart");
  return normalizeLines(data.items);
}

async function pushGuestLinesToServer(lines: GuestCartLine[]) {
  for (const line of lines) {
    if (line.size || line.comboChoices?.length) continue;
    try {
      await api("/cart", {
        method: "POST",
        body: JSON.stringify({ itemId: line.id, quantity: line.qty }),
      });
    } catch {
      /* keep the local line if the API item is missing */
    }
  }
}

/**
 * Load cart for cart + checkout: never drop local lines just because
 * the signed-in API cart is empty.
 */
let loadShopCartInflight: Promise<{
  items: GuestCartLine[];
  synced: boolean;
}> | null = null;

export async function loadShopCart(options?: {
  syncGuest?: boolean;
}): Promise<{
  items: GuestCartLine[];
  synced: boolean;
}> {
  const syncGuest = options?.syncGuest !== false;
  if (syncGuest && loadShopCartInflight) return loadShopCartInflight;

  const run = (async () => {
    const guest = readGuestCart();
    const snapshot = readCartSnapshot();

    if (!getToken()) {
      const items = mergeCartLines(guest, snapshot);
      writeCartSnapshot(items);
      return { items, synced: false };
    }

    try {
      let server = await fetchServerCart();
      if (syncGuest) {
        const missing = guest.filter(
          (g) =>
            !g.size &&
            !g.comboChoices?.length &&
            !server.some((s) => s.id === g.id),
        );
        const toPush = missing.length ? missing : server.length ? [] : guest;
        if (toPush.length) {
          await pushGuestLinesToServer(toPush);
          server = await fetchServerCart();
        }
      }

      const items = mergeCartLines(server, guest, snapshot);
      if (
        syncGuest &&
        server.length &&
        guest.every(
          (g) =>
            !g.size &&
            !g.comboChoices?.length &&
            server.some((s) => s.id === g.id),
        )
      ) {
        localStorage.removeItem(CART_KEY);
      }
      writeCartSnapshot(items);
      return { items, synced: server.length > 0 };
    } catch {
      const items = mergeCartLines(guest, snapshot);
      writeCartSnapshot(items);
      return { items, synced: false };
    }
  })();

  if (syncGuest) {
    loadShopCartInflight = run.finally(() => {
      loadShopCartInflight = null;
    });
    return loadShopCartInflight;
  }

  return run;
}
