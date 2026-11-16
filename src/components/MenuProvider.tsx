"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type MenuItem,
  normalizeAlcoholKind,
  normalizeComboSlots,
  normalizeSizePrices,
} from "@/data/menu";
import { api } from "@/lib/api";

type MenuCtx = {
  items: MenuItem[];
  pizzas: MenuItem[];
  sides: MenuItem[];
  combos: MenuItem[];
  drinks: MenuItem[];
  burgers: MenuItem[];
  fruit: MenuItem[];
  alcohol: MenuItem[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  getById: (id: string) => MenuItem | undefined;
  related: (item: MenuItem, limit?: number) => MenuItem[];
};

const MenuContext = createContext<MenuCtx>({
  items: [],
  pizzas: [],
  sides: [],
  combos: [],
  drinks: [],
  burgers: [],
  fruit: [],
  alcohol: [],
  loading: true,
  error: "",
  refresh: async () => {},
  getById: () => undefined,
  related: () => [],
});

const PIZZA_CATS = new Set(["classic", "cheese", "veggie", "meat"]);

function normalize(raw: MenuItem[]): MenuItem[] {
  return raw.map((item) => {
    const details =
      item.details && typeof item.details === "object"
        ? { ...item.details }
        : undefined;
    if (details) {
      const sizes = normalizeSizePrices(details.sizes);
      if (sizes) details.sizes = sizes;
      else delete details.sizes;
      const alcoholKind = normalizeAlcoholKind(details.alcoholKind);
      if (alcoholKind) details.alcoholKind = alcoholKind;
      else delete details.alcoholKind;
      const slots = normalizeComboSlots(details.comboSlots);
      if (slots) details.comboSlots = slots;
      else delete details.comboSlots;
    }
    const rawCategory = String(item.category || "");
    const category = (
      rawCategory === "dessert" ? "fruit" : rawCategory
    ) as MenuItem["category"];
    return {
      ...item,
      category,
      rating: Number(item.rating) || 0,
      reviews: Number(item.reviews) || 0,
      price: Number(item.price) || 0,
      images: Array.isArray(item.images)
        ? item.images.filter(Boolean)
        : item.image
          ? [item.image]
          : undefined,
      details,
    };
  });
}

export function useMenu() {
  return useContext(MenuContext);
}

/** Live menu from the Palm Pizza API / database. */
export default function MenuProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ items: MenuItem[] }>("/menu");
      setItems(normalize(Array.isArray(data.items) ? data.items : []));
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load the menu from the server.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onUpdate = () => void refresh();
    window.addEventListener("palm-menu-updated", onUpdate);
    window.addEventListener("palm-settings-updated", onUpdate);
    window.addEventListener("focus", onUpdate);
    return () => {
      window.removeEventListener("palm-menu-updated", onUpdate);
      window.removeEventListener("palm-settings-updated", onUpdate);
      window.removeEventListener("focus", onUpdate);
    };
  }, [refresh]);

  const value = useMemo<MenuCtx>(() => {
    const pizzas = items.filter((i) => PIZZA_CATS.has(i.category));
    const sides = items.filter((i) => i.category === "side");
    const combos = items.filter((i) => i.category === "combo");
    const drinks = items.filter((i) => i.category === "drink");
    const burgers = items.filter((i) => i.category === "burger");
    const fruit = items.filter((i) => i.category === "fruit");
    const alcohol = items.filter((i) => i.category === "alcohol");
    return {
      items,
      pizzas,
      sides,
      combos,
      drinks,
      burgers,
      fruit,
      alcohol,
      loading,
      error,
      refresh,
      getById: (id) => items.find((i) => i.id === id),
      related: (item, limit = 4) =>
        items
          .filter((o) => o.id !== item.id && o.category === item.category)
          .slice(0, limit),
    };
  }, [items, loading, error, refresh]);

  return (
    <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
  );
}
