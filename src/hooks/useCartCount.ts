"use client";

import { useCallback, useEffect, useState } from "react";
import { loadShopCart } from "@/lib/cart";

/** Live cart item count for header badges */
export function useCartCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const cart = await loadShopCart({ syncGuest: false });
    setCount(cart.items.reduce((s, i) => s + i.qty, 0));
  }, []);

  useEffect(() => {
    void refresh();
    const onUpdate = () => void refresh();
    window.addEventListener("palm-cart-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("palm-cart-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refresh]);

  return count;
}
