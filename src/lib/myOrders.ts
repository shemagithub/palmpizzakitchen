const KEY = "palm_my_order_ids";

export type RememberedOrder = {
  id: string;
  email?: string;
  at: number;
};

function readAll(): RememberedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RememberedOrder[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row) => row && typeof row.id === "string");
  } catch {
    return [];
  }
}

export function rememberOrder(id: string, email?: string) {
  if (typeof window === "undefined" || !id) return;
  const next = [
    { id, email: email || undefined, at: Date.now() },
    ...readAll().filter((row) => row.id !== id),
  ].slice(0, 30);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function rememberedOrderIds() {
  return readAll().map((row) => row.id);
}
