"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightIcon,
  BagIcon,
  HomeIcon,
  MinusIcon,
  PlusIcon,
  ScooterIcon,
  TrashIcon,
} from "@/components/icons";
import ResolvedMenuImage from "@/components/ResolvedMenuImage";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { formatPrice, goToProduct, productPath } from "@/data/menu";
import { minDeliveryFee, parseDeliveryAreaFees } from "@/lib/deliveryAreas";
import { api } from "@/lib/api";
import { orderBlockReason } from "@/lib/orderRules";
import {
  loadShopCart,
  readFulfillment,
  readGuestCart,
  writeFulfillment,
  writeGuestCart,
  type Fulfillment,
  type GuestCartLine,
} from "@/lib/cart";

type CartLine = GuestCartLine;

export default function CartView() {
  const { settings } = useSiteSettings();
  const [items, setItems] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [synced, setSynced] = useState(false);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [cartError, setCartError] = useState("");

  useEffect(() => {
    async function load() {
      const cart = await loadShopCart();
      setItems(cart.items);
      setSynced(cart.synced);
      setLoading(false);
    }
    void load();
    setFulfillment(readFulfillment());

    const onCart = () => {
      void loadShopCart().then((cart) => {
        setItems(cart.items);
        setSynced(cart.synced);
      });
    };
    window.addEventListener("palm-cart-updated", onCart);
    return () => window.removeEventListener("palm-cart-updated", onCart);
  }, []);

  const defaultDeliveryFee = Number(settings.delivery_fee) || 1500;
  const deliveryFrom = useMemo(
    () =>
      minDeliveryFee(
        parseDeliveryAreaFees(settings.delivery_area_fees, defaultDeliveryFee),
        defaultDeliveryFee,
      ),
    [settings.delivery_area_fees, defaultDeliveryFee],
  );
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items],
  );
  const total = subtotal;
  const checkoutBlock = orderBlockReason(subtotal, settings);

  const persistGuest = (next: CartLine[]) => {
    setItems(next);
    if (!synced) writeGuestCart(next);
  };

  const chooseFulfillment = (next: Fulfillment) => {
    setFulfillment(next);
    writeFulfillment(next);
  };

  const sameLine = (
    a: CartLine,
    b: Pick<CartLine, "id" | "size" | "comboChoices" | "offerBundle">,
  ) => {
    if (a.id !== b.id || (a.size || "") !== (b.size || "")) return false;
    const aOffer = a.offerBundle
      ? `${a.offerBundle.offerId}:${a.offerBundle.paidItemId}:${a.offerBundle.freeItemId || ""}`
      : "";
    const bOffer = b.offerBundle
      ? `${b.offerBundle.offerId}:${b.offerBundle.paidItemId}:${b.offerBundle.freeItemId || ""}`
      : "";
    if (aOffer !== bOffer) return false;
    const aKey = (a.comboChoices || [])
      .map((c) => `${c.slotId}=${c.itemId}`)
      .sort()
      .join("|");
    const bKey = (b.comboChoices || [])
      .map((c) => `${c.slotId}=${c.itemId}`)
      .sort()
      .join("|");
    return aKey === bKey;
  };

  const isLocalOnlyLine = (line: CartLine) =>
    Boolean(line.size || line.comboChoices?.length || line.offerBundle);

  const persistLocalAware = (next: CartLine[]) => {
    setItems(next);
    const special = next.filter((i) => isLocalOnlyLine(i));
    const rest = synced
      ? readGuestCart().filter((i) => !isLocalOnlyLine(i))
      : next.filter((i) => !isLocalOnlyLine(i));
    writeGuestCart([...rest, ...special]);
  };

  const updateQty = async (target: CartLine, delta: number) => {
    const current = items.find((i) => sameLine(i, target));
    if (!current) return;
    const nextQty = Math.max(0, current.qty + delta);

    const next = items
      .map((item) =>
        sameLine(item, target) ? { ...item, qty: nextQty } : item,
      )
      .filter((item) => item.qty > 0);

    if (synced && !isLocalOnlyLine(target)) {
      setItems(next);
      try {
        await api(`/cart/${target.id}`, {
          method: "PATCH",
          body: JSON.stringify({ quantity: nextQty }),
        });
      } catch (err) {
        setCartError(
          err instanceof Error ? err.message : "Could not update your cart.",
        );
      }
    } else {
      persistLocalAware(next);
    }
  };

  const removeItem = async (target: CartLine) => {
    const next = items.filter((item) => !sameLine(item, target));
    if (synced && !isLocalOnlyLine(target)) {
      setItems(next);
      try {
        await api(`/cart/${target.id}`, { method: "DELETE" });
      } catch (err) {
        setCartError(
          err instanceof Error ? err.message : "Could not remove that item.",
        );
      }
    } else {
      persistLocalAware(next);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-pam-muted">
        Loading cart…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="soft-card mx-auto max-w-lg rounded-3xl p-8 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pam-sand text-pam-red">
          <BagIcon className="h-8 w-8" />
        </span>
        <h2 className="font-[family-name:var(--font-oswald)] text-2xl">
          Your cart is empty
        </h2>
        <Link
          href="/pizzas"
          className="mt-5 inline-flex rounded-full bg-pam-red px-5 py-3 text-sm font-bold text-white"
        >
          Browse menu
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1100px] gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-3">
        {!synced && (
          <p className="rounded-2xl bg-pam-gold-soft px-4 py-3 text-xs text-pam-ink">
            Saved on this device.{" "}
            <Link href="/account" className="font-bold text-pam-red">
              Sign in
            </Link>{" "}
            to sync your cart across devices.
          </p>
        )}
        {items.map((item) => (
          <article
            key={`${item.id}-${item.size || "one"}-${(item.comboChoices || [])
              .map((c) => c.itemId)
              .join("_") || "plain"}`}
            className="soft-card flex gap-4 rounded-3xl border border-pam-border/70 bg-white p-4"
          >
            <a
              href={productPath(item.id)}
              onClick={(e) => {
                e.preventDefault();
                goToProduct(item.id);
              }}
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-pam-sand"
            >
              {item.image && (
                <ResolvedMenuImage
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              )}
            </a>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <a
                    href={productPath(item.id)}
                    onClick={(e) => {
                      e.preventDefault();
                      goToProduct(item.id);
                    }}
                    className="font-[family-name:var(--font-oswald)] text-lg hover:text-pam-red"
                  >
                    {item.name}
                  </a>
                  <p className="mt-0.5 text-xs font-semibold text-pam-muted">
                    {item.offerBundle ? (
                      <span className="text-pam-red">
                        Promo {item.offerBundle.offerCode}
                        {item.offerBundle.offerType === "bogo"
                          ? " · BOGO"
                          : " · Deal price"}
                      </span>
                    ) : (
                      "Tap for details"
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => void removeItem(item)}
                  className="text-pam-muted hover:text-pam-red"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 font-semibold">{formatPrice(item.price)}</p>
              <div className="mt-3 inline-flex items-center rounded-full border border-pam-border">
                <button
                  type="button"
                  onClick={() => void updateQty(item, -1)}
                  className="px-3 py-1.5"
                >
                  <MinusIcon className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-8 text-center text-sm font-bold">
                  {item.qty}
                </span>
                <button
                  type="button"
                  onClick={() => void updateQty(item, 1)}
                  className="px-3 py-1.5"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <aside className="soft-card h-fit rounded-3xl border border-pam-border/70 bg-white p-5">
        <h2 className="font-[family-name:var(--font-oswald)] text-xl">
          Summary
        </h2>
        <p className="mt-3 text-xs font-bold tracking-wide text-pam-muted uppercase">
          How do you want it?
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => chooseFulfillment("delivery")}
            className={`rounded-2xl border px-3 py-3 text-left transition ${
              fulfillment === "delivery"
                ? "border-pam-red bg-pam-red/[0.06] shadow-[0_8px_20px_rgba(227,24,55,0.1)]"
                : "border-pam-border bg-pam-sand/40"
            }`}
          >
            <ScooterIcon className="h-4 w-4 text-pam-red" />
            <p className="mt-1.5 text-sm font-extrabold text-pam-ink">Delivery</p>
            <p className="mt-0.5 text-[11px] text-pam-muted">
              From {formatPrice(deliveryFrom)}
            </p>
          </button>
          <button
            type="button"
            onClick={() => chooseFulfillment("pickup")}
            className={`rounded-2xl border px-3 py-3 text-left transition ${
              fulfillment === "pickup"
                ? "border-pam-red bg-pam-red/[0.06] shadow-[0_8px_20px_rgba(227,24,55,0.1)]"
                : "border-pam-border bg-pam-sand/40"
            }`}
          >
            <HomeIcon className="h-4 w-4 text-pam-red" />
            <p className="mt-1.5 text-sm font-extrabold text-pam-ink">Pickup</p>
            <p className="mt-0.5 text-[11px] text-pam-muted">No delivery fee</p>
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-pam-muted">Subtotal</span>
            <span className="font-semibold">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-pam-muted">
              {fulfillment === "pickup" ? "Pickup" : "Delivery"}
            </span>
            <span className="font-semibold">
              {fulfillment === "pickup"
                ? "Free"
                : `From ${formatPrice(deliveryFrom)}`}
            </span>
          </div>
          {fulfillment === "delivery" && (
            <p className="text-[11px] leading-relaxed text-pam-muted">
              Exact delivery fee is set at checkout when you pick your area.
            </p>
          )}
          <div className="flex justify-between border-t border-pam-border pt-3 text-base">
            <span className="font-bold">
              {fulfillment === "delivery" ? "Subtotal" : "Total"}
            </span>
            <span className="font-[family-name:var(--font-oswald)] text-2xl">
              {formatPrice(total)}
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-pam-gold-soft/70 p-3 text-xs">
          {fulfillment === "pickup" ? (
            <HomeIcon className="mt-0.5 h-4 w-4 shrink-0 text-pam-red" />
          ) : (
            <ScooterIcon className="mt-0.5 h-4 w-4 shrink-0 text-pam-red" />
          )}
          <p>
            {fulfillment === "pickup"
              ? "We’ll have it ready at the shop. No delivery fee."
              : "Usually arrives in about 30 minutes after checkout."}
          </p>
        </div>
        {cartError && (
          <div className="mt-3 rounded-2xl bg-pam-red/10 px-3 py-2 text-xs font-medium text-pam-red">
            {cartError}
          </div>
        )}
        {checkoutBlock ? (
          <div className="mt-4 rounded-2xl bg-pam-gold-soft px-4 py-3 text-xs font-medium text-pam-ink">
            {checkoutBlock}
          </div>
        ) : null}
        {checkoutBlock ? (
          <button
            type="button"
            disabled
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-pam-border py-3.5 text-sm font-bold text-pam-muted"
          >
            Checkout unavailable
          </button>
        ) : (
          <Link
            href="/checkout"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-pam-red py-3.5 text-sm font-bold text-white"
          >
            Checkout
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        )}
      </aside>
    </div>
  );
}
