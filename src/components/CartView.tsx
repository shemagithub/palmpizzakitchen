"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  formatComboChoicesLabel,
  formatPrice,
  goToProduct,
  productPath,
  sizeLabel,
} from "@/data/menu";
import { minDeliveryFee, parseDeliveryAreaFees } from "@/lib/deliveryAreas";
import { api, getToken } from "@/lib/api";
import { orderBlockReason } from "@/lib/orderRules";
import { packagingFeeFor } from "@/lib/packagingFee";
import {
  cartLineKey,
  isLocalOnlyCartLine,
  loadShopCart,
  readFulfillment,
  sameCartLine,
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
  const [pendingKey, setPendingKey] = useState("");
  const persistFromSelf = useRef(false);

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
      if (persistFromSelf.current) {
        persistFromSelf.current = false;
        return;
      }
      void loadShopCart().then((cart) => {
        setItems(cart.items);
        setSynced(cart.synced);
      });
    };
    window.addEventListener("palm-cart-updated", onCart);
    return () => window.removeEventListener("palm-cart-updated", onCart);
  }, []);

  const defaultDeliveryFee = Number(settings.delivery_fee) || 0;
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
  const packagingFee = packagingFeeFor(settings, fulfillment);
  const total = subtotal + packagingFee;
  const checkoutBlock = orderBlockReason(subtotal, settings);

  const persistCart = (next: CartLine[]) => {
    persistFromSelf.current = true;
    setItems(next);
    writeGuestCart(next);
  };

  const chooseFulfillment = (next: Fulfillment) => {
    setFulfillment(next);
    writeFulfillment(next);
  };

  const applyCartChange = async (
    target: CartLine,
    next: CartLine[],
    serverQty?: number,
  ) => {
    const key = cartLineKey(target);
    setPendingKey(key);
    setItems(next);
    setCartError("");
    try {
      const token = getToken();
      if (synced && token && !isLocalOnlyCartLine(target)) {
        const remove = serverQty == null || serverQty <= 0;
        if (remove) {
          await api(`/cart/${encodeURIComponent(target.id)}`, {
            method: "DELETE",
          });
        } else {
          await api(`/cart/${encodeURIComponent(target.id)}`, {
            method: "PATCH",
            body: JSON.stringify({ quantity: serverQty }),
          });
        }
      } else if (synced && !token) {
        setSynced(false);
      }
      persistCart(next);
    } catch (err) {
      // Keep the local change so trash / qty still work if the API session is stale.
      persistCart(next);
      if (!getToken()) setSynced(false);
      const status = (err as { status?: number } | null)?.status;
      if (status && status !== 401 && status !== 404) {
        setCartError(
          err instanceof Error
            ? err.message
            : "Saved on this device. Sign in again to sync across devices.",
        );
      }
    } finally {
      setPendingKey("");
    }
  };

  const updateQty = async (target: CartLine, delta: number) => {
    if (pendingKey) return;
    const current = items.find((item) => sameCartLine(item, target));
    if (!current) return;
    const nextQty = Math.max(0, current.qty + delta);
    const next = items
      .map((item) =>
        sameCartLine(item, target) ? { ...item, qty: nextQty } : item,
      )
      .filter((item) => item.qty > 0);
    await applyCartChange(target, next, nextQty);
  };

  const removeItem = async (target: CartLine) => {
    if (pendingKey) return;
    const next = items.filter((item) => !sameCartLine(item, target));
    await applyCartChange(target, next, 0);
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
        {items.map((item) => {
          const lineKey = cartLineKey(item);
          const comboLabel = formatComboChoicesLabel(item.comboChoices);
          const busy = pendingKey === lineKey;
          return (
          <article
            key={lineKey}
            className={`soft-card flex gap-4 rounded-3xl border border-pam-border/70 bg-white p-4 ${
              busy ? "opacity-60" : ""
            }`}
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
                    ) : item.size ? (
                      sizeLabel(item.size)
                    ) : comboLabel ? (
                      comboLabel
                    ) : (
                      "Tap for details"
                    )}
                  </p>
                  {item.size && (item.offerBundle || comboLabel) ? (
                    <p className="mt-0.5 text-[11px] text-pam-muted">
                      {sizeLabel(item.size)}
                      {comboLabel ? ` · ${comboLabel}` : ""}
                    </p>
                  ) : comboLabel && item.offerBundle ? (
                    <p className="mt-0.5 text-[11px] text-pam-muted">
                      {comboLabel}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label="Remove"
                  disabled={Boolean(pendingKey)}
                  onClick={() => void removeItem(item)}
                  className="text-pam-muted hover:text-pam-red disabled:opacity-40"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 font-semibold">{formatPrice(item.price)}</p>
              <div className="mt-3 inline-flex items-center rounded-full border border-pam-border">
                <button
                  type="button"
                  disabled={Boolean(pendingKey)}
                  aria-label="Decrease quantity"
                  onClick={() => void updateQty(item, -1)}
                  className="px-3 py-1.5 disabled:opacity-40"
                >
                  <MinusIcon className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-8 text-center text-sm font-bold">
                  {item.qty}
                </span>
                <button
                  type="button"
                  disabled={Boolean(pendingKey)}
                  aria-label="Increase quantity"
                  onClick={() => void updateQty(item, 1)}
                  className="px-3 py-1.5 disabled:opacity-40"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </article>
          );
        })}
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
            <p className="mt-0.5 text-[11px] text-pam-muted">
              {packagingFeeFor(settings, "pickup") > 0
                ? `Packaging ${formatPrice(packagingFeeFor(settings, "pickup"))}`
                : "No delivery fee"}
            </p>
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-pam-muted">Subtotal</span>
            <span className="font-semibold">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-pam-muted">Packaging</span>
            <span className="font-semibold">
              {packagingFee ? formatPrice(packagingFee) : "Free"}
            </span>
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
              {fulfillment === "delivery" ? "Items + packaging" : "Total"}
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
              ? packagingFee
                ? `We’ll have it ready at the shop. Packaging ${formatPrice(packagingFee)}. No delivery fee.`
                : "We’ll have it ready at the shop. No delivery fee."
              : packagingFee
                ? `Packaging ${formatPrice(packagingFee)} is included. Delivery is added at checkout.`
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
