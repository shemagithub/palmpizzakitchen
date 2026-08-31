"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HomeIcon, MailIcon, PhoneIcon, PinIcon, ScooterIcon, UserIcon } from "@/components/icons";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { formatPrice } from "@/data/menu";
import { api } from "@/lib/api";
import {
  clearGuestCart,
  loadShopCart,
  readFulfillment,
  writeCartSnapshot,
  writeFulfillment,
  type Fulfillment,
  type GuestCartLine,
} from "@/lib/cart";
import { useAuthUser } from "@/hooks/useAuthUser";
import { rememberOrder } from "@/lib/myOrders";
import {
  minDeliveryFee,
  parseDeliveryAreaFees,
  resolveDeliveryFeeForArea,
  type DeliveryAreaFee,
} from "@/lib/deliveryAreas";
import { orderBlockReason } from "@/lib/orderRules";
import { promoLineBadge } from "@/lib/offers";

type CartLine = GuestCartLine;

type Step = "details" | "pay" | "confirming" | "done";
type PayMethod = "card" | "airtel" | "momo";

const PAY_OPTIONS: {
  id: PayMethod;
  title: string;
  subtitle: string;
  badge: string;
  tone: string;
  accent: string;
}[] = [
  {
    id: "card",
    title: "Card",
    subtitle: "Visa · Mastercard · debit",
    badge: "Card",
    tone: "from-[#1c1917] to-[#3f3a36]",
    accent: "bg-[#1c1917]",
  },
  {
    id: "airtel",
    title: "Airtel Money",
    subtitle: "Pay with your Airtel number",
    badge: "Airtel",
    tone: "from-[#ed1c24] to-[#a30f14]",
    accent: "bg-[#ed1c24]",
  },
  {
    id: "momo",
    title: "MoMo",
    subtitle: "MTN Mobile Money",
    badge: "MoMo",
    tone: "from-[#ffcc00] to-[#c9a000]",
    accent: "bg-[#ffcc00] text-pam-ink",
  },
];

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export default function CheckoutClient() {
  const { user } = useAuthUser();
  const { settings } = useSiteSettings();
  const [step, setStep] = useState<Step>("details");
  const [orderId, setOrderId] = useState("");
  const [items, setItems] = useState<CartLine[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState("");
  const [locationOk, setLocationOk] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("momo");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState(1500);
  const [areaFees, setAreaFees] = useState<DeliveryAreaFee[]>([]);
  const [payProgress, setPayProgress] = useState(0);
  const [payHint, setPayHint] = useState("");
  const [payReady, setPayReady] = useState(true);
  const [cartLoading, setCartLoading] = useState(true);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");

  // Mobile money fields
  const [momoPhone, setMomoPhone] = useState("");

  useEffect(() => {
    async function load() {
      try {
        try {
          const settings = await api<{ settings: Record<string, string> }>(
            "/settings",
          );
          const base = Number(settings.settings.delivery_fee) || 1500;
          setDefaultDeliveryFee(base);
          setAreaFees(
            parseDeliveryAreaFees(settings.settings.delivery_area_fees, base),
          );
        } catch {
          /* keep default */
        }

        try {
          const pay = await api<{ configured: boolean }>("/payments/config");
          setPayReady(Boolean(pay.configured));
        } catch {
          setPayReady(false);
        }

        const cart = await loadShopCart();
        setItems(cart.items);
        writeCartSnapshot(cart.items);
        setFulfillment(readFulfillment());
      } finally {
        setCartLoading(false);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    if (user?.name && !name) setName(user.name);
    if (user?.email && !email) setEmail(user.email);
  }, [user, name, email]);

  const deliveryFee = useMemo(() => {
    if (!area) return 0;
    return resolveDeliveryFeeForArea(areaFees, area, defaultDeliveryFee);
  }, [area, areaFees, defaultDeliveryFee]);

  const deliveryFrom = useMemo(
    () => minDeliveryFee(areaFees, defaultDeliveryFee),
    [areaFees, defaultDeliveryFee],
  );

  const subtotal = items.reduce(
    (s, i) => s + Number(i.price) * Number(i.qty),
    0,
  );
  const delivery =
    items.length && fulfillment === "delivery" && area ? deliveryFee : 0;
  const total = subtotal + delivery;
  const checkoutBlock = orderBlockReason(subtotal, settings);
  const canCheckout = !checkoutBlock && payReady;

  const fullAddress = useMemo(() => {
    const parts = [
      street.trim(),
      area ? `${area}, Kigali` : "",
      landmark.trim() ? `Near ${landmark.trim()}` : "",
      coords
        ? `Live GPS ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
        : "",
      locationLabel ? `(${locationLabel})` : "",
    ].filter(Boolean);
    return parts.join(" · ");
  }, [street, area, landmark, coords, locationLabel]);

  const matchAreaFromText = (text: string) => {
    const hay = text.toLowerCase();
    const found = areaFees.find((item) => {
      if (item.area.toLowerCase() === "other") return false;
      const needle = item.area.toLowerCase().replace(" / cbd", "").trim();
      return needle && hay.includes(needle);
    });
    return found?.area || "";
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        display_name?: string;
        address?: Record<string, string>;
      };
      const label = String(data.display_name || "").trim();
      if (label) setLocationLabel(label.split(",").slice(0, 3).join(","));
      const blob = [
        label,
        data.address?.suburb,
        data.address?.neighbourhood,
        data.address?.city_district,
        data.address?.quarter,
        data.address?.village,
        data.address?.town,
      ]
        .filter(Boolean)
        .join(" ");
      const matched = matchAreaFromText(blob);
      if (matched) {
        setArea(matched);
        if (!street.trim()) {
          const road = data.address?.road || data.address?.neighbourhood;
          if (road) setStreet(road);
        }
      } else if (!area) {
        setArea("Other");
      }
    } catch {
      /* GPS still saved without reverse geocode */
    }
  };

  const shareLiveLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Live location is not supported on this device or browser.");
      return;
    }
    setLocating(true);
    setError("");
    setLocationOk("");

    const finishOk = async (lat: number, lng: number, accuracy?: number) => {
      setCoords({ lat, lng, accuracy });
      setLocationOk("Live location shared with your order.");
      await reverseGeocode(lat, lng);
      setLocating(false);
    };

    const onFail = (err: GeolocationPositionError | null) => {
      setLocating(false);
      const code = err?.code;
      if (code === 1) {
        setError(
          "Location permission denied. Allow location for this site, or pick your area and type the street.",
        );
      } else if (code === 3) {
        setError(
          "Location timed out. Try again outdoors, or pick your area manually.",
        );
      } else {
        setError(
          "Could not get your live location. Pick your area and enter the street instead.",
        );
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void finishOk(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy,
        );
      },
      (err) => onFail(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const clearLiveLocation = () => {
    setCoords(null);
    setLocationLabel("");
    setLocationOk("");
  };

  const goToPay = () => {
    setError("");
    if (checkoutBlock) {
      setError(checkoutBlock);
      return;
    }
    if (!payReady) {
      setError("Online payment is not available right now. Contact the shop.");
      return;
    }
    if (!items.length) {
      setError("Your cart is empty.");
      return;
    }
    if (!name.trim() || !phone.trim()) {
      setError("Enter your name and phone number.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email so we can send your receipt.");
      return;
    }
    if (fulfillment === "delivery" && (!area || !street.trim())) {
      setError("Select your area and enter street / house details.");
      return;
    }
    if (!momoPhone) setMomoPhone(phone);
    setStep("pay");
  };

  const chooseFulfillment = (next: Fulfillment) => {
    setFulfillment(next);
    writeFulfillment(next);
  };

  const validatePayment = () => {
    if (paymentMethod === "card") return "";
    const p = digitsOnly(momoPhone);
    if (p.length < 9) {
      return `Enter a valid ${paymentMethod === "airtel" ? "Airtel" : "MoMo"} phone number.`;
    }
    return "";
  };

  const waitForPayment = async (id: string, reference: string) => {
    const started = Date.now();
    while (Date.now() - started < 180000) {
      const data = await api<{
        payment?: { status?: string };
      }>(`/payments/${id}?reference=${encodeURIComponent(reference)}`);
      if (data.payment?.status === "paid") return data;
      if (data.payment?.status === "failed") {
        throw new Error("Payment was declined, cancelled, or timed out.");
      }
      const elapsed = Math.round((Date.now() - started) / 1000);
      setPayHint(
        `Waiting for confirmation… ${elapsed}s. Approve the prompt on your phone.`,
      );
      setPayProgress((p) => Math.min(p + 6, 92));
      await new Promise((resolve) => window.setTimeout(resolve, 3000));
    }
    throw new Error(
      "Still waiting for Mobile Money confirmation. Check your phone, then open My Orders.",
    );
  };

  const placeOrder = async () => {
    if (checkoutBlock) {
      setError(checkoutBlock);
      return;
    }
    if (!payReady) {
      setError("Online payment is not available right now. Contact the shop.");
      return;
    }
    const payError = validatePayment();
    if (payError) {
      setError(payError);
      return;
    }
    setError("");
    setLoading(true);
    setStep("confirming");
    setPayProgress(12);

    const tick = window.setInterval(() => {
      setPayProgress((p) => Math.min(p + 18, 92));
    }, 280);

    try {
      const methodLabel =
        paymentMethod === "card"
          ? "card"
          : paymentMethod === "airtel"
            ? "airtel_money"
            : "mtn_momo";

      const data = await api<{
        order: { id: string };
        payment?: {
          status?: string;
          reference?: string;
          paymentUrl?: string | null;
          message?: string;
        };
      }>("/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: name,
          email,
          phone,
          payerPhone: momoPhone || phone,
          address:
            fulfillment === "pickup"
              ? "Pickup at Palm Pizza Kitchen"
              : fullAddress,
          fulfillment,
          paymentMethod: methodLabel,
          area: fulfillment === "delivery" ? area : undefined,
          items: items.map((i) => ({
            itemId: i.id,
            quantity: i.qty,
            size: i.size,
            unitPrice: i.price,
            comboChoices: i.comboChoices,
            offerBundle: i.offerBundle,
          })),
          notes: [
            `pay:${methodLabel}`,
            fulfillment === "pickup" ? "fulfillment:pickup" : "fulfillment:delivery",
            ...items
              .map((i) => i.offerBundle?.offerCode)
              .filter(Boolean)
              .map((code) => `promo:${code}`),
            area ? `area:${area}` : "",
            landmark ? `landmark:${landmark}` : "",
            coords
              ? `live-gps:${coords.lat},${coords.lng}${
                  coords.accuracy
                    ? `|acc:${Math.round(coords.accuracy)}m`
                    : ""
                }`
              : "",
            locationLabel ? `place:${locationLabel}` : "",
          ]
            .filter(Boolean)
            .join(" | "),
        }),
      });

      const reference = data.payment?.reference || "";
      sessionStorage.setItem(
        "palm_pay",
        JSON.stringify({
          orderId: data.order.id,
          reference,
          total,
          area,
        }),
      );
      rememberOrder(data.order.id, email);

      if (data.payment?.paymentUrl) {
        window.location.href = data.payment.paymentUrl;
        return;
      }

      setPayHint(
        data.payment?.message ||
          "Approve the payment prompt on your phone.",
      );
      await waitForPayment(data.order.id, reference);
      setPayProgress(100);
      window.clearInterval(tick);
      await new Promise((r) => window.setTimeout(r, 350));
      setOrderId(data.order.id);
      clearGuestCart();
      setStep("done");
    } catch (err) {
      window.clearInterval(tick);
      setStep("pay");
      setError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: "details", label: fulfillment === "pickup" ? "Contact" : "Location" },
    { id: "pay", label: "Pay" },
    { id: "done", label: "Done" },
  ] as const;

  const activeStepIndex =
    step === "details" ? 0 : step === "done" ? 2 : 1;

  if (step === "done") {
    const methodTitle =
      PAY_OPTIONS.find((p) => p.id === paymentMethod)?.title || "Payment";
    return (
      <section className="bg-pam-warm px-3 py-10 sm:px-5 sm:py-14 md:px-8">
        <div className="soft-card mx-auto w-full max-w-lg rounded-xl border border-pam-border bg-white p-5 text-center sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pam-basil text-xl font-bold text-white sm:h-16 sm:w-16 sm:text-2xl">
            ✓
          </div>
          <p className="mt-4 text-sm font-bold text-pam-basil sm:mt-5">
            Payment received
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-oswald)] text-[1.75rem] leading-tight text-pam-ink sm:mt-3 sm:text-3xl md:text-4xl">
            We’re firing up the oven
          </h1>
          <p className="mt-3 text-sm text-pam-muted">
            Order <span className="font-bold text-pam-ink">{orderId}</span> paid
            with {methodTitle}. A PDF receipt was sent to {email || "your email"}
            .{" "}
            {fulfillment === "pickup"
              ? "Collect it at Palm Pizza Kitchen."
              : `Delivering to ${area || "your location"}.`}
          </p>
          <div className="mt-5 rounded-2xl bg-pam-sand/60 px-4 py-3 text-left text-sm sm:mt-6">
            <p className="font-bold text-pam-ink">{formatPrice(total)}</p>
            <p className="mt-1 break-words text-xs text-pam-muted">
              {fulfillment === "pickup"
                ? "Pickup at Palm Pizza Kitchen"
                : fullAddress}
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
            <Link
              href="/orders"
              className="rounded-full bg-pam-red px-5 py-3.5 text-sm font-bold text-white"
            >
              Track order
            </Link>
            <Link
              href="/"
              className="rounded-full bg-pam-sand px-5 py-3.5 text-sm font-bold text-pam-ink"
            >
              Back home
            </Link>
          </div>
        </div>
      </section>
    );
  }

  function renderSummaryBody(compact = false) {
    return (
      <>
        <div
          className={`space-y-2.5 text-sm ${compact ? "mt-0" : "mt-3 sm:mt-4 sm:space-y-3"}`}
        >
          {cartLoading && (
            <p className="text-pam-muted">Loading your cart…</p>
          )}
          {items.map((item) => (
            <div
              key={`${item.id}-${item.size || ""}-${item.offerBundle?.offerId || ""}-${(item.comboChoices || [])
                .map((c) => c.itemId)
                .join("_")}`}
              className="flex justify-between gap-3"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-pam-ink">
                  {item.name} ×{item.qty}
                </span>
                <span className="text-xs text-pam-muted">
                  {formatPrice(Number(item.price))} each
                  {item.offerBundle ? (
                    <span className="ml-2 font-bold text-pam-red">
                      {promoLineBadge(item.name, item.offerBundle.offerCode)}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="shrink-0 font-semibold">
                {formatPrice(Number(item.price) * Number(item.qty))}
              </span>
            </div>
          ))}
          {!cartLoading && !items.length && (
            <p className="text-pam-muted">
              Cart is empty.{" "}
              <Link href="/pizzas" className="font-bold text-pam-red">
                Add pizza
              </Link>
            </p>
          )}
          <div className="flex justify-between border-t border-pam-border pt-3">
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
                : area
                  ? formatPrice(delivery)
                  : `From ${formatPrice(deliveryFrom)}`}
            </span>
          </div>
          <div className="flex items-end justify-between border-t border-pam-border pt-3">
            <span className="font-bold">Total</span>
            <span className="font-[family-name:var(--font-oswald)] text-xl sm:text-2xl">
              {formatPrice(total)}
            </span>
          </div>
        </div>

        {(fulfillment === "pickup" || area || street) && (
          <div className="mt-4 rounded-2xl bg-pam-sand/70 p-3 text-xs sm:mt-5 sm:p-3.5">
            <p className="font-bold text-pam-ink">
              {fulfillment === "pickup" ? "Pickup" : "Deliver to"}
            </p>
            <p className="mt-1 break-words leading-relaxed text-pam-muted">
              {fulfillment === "pickup"
                ? "Palm Pizza Kitchen - collect in store"
                : fullAddress || "Add your location"}
            </p>
          </div>
        )}
      </>
    );
  }

  return (
    <section className="bg-pam-warm pb-[9.5rem] pt-5 sm:pt-8 md:pb-10 md:pt-10 lg:py-12">
      <div className="mx-auto w-full max-w-[1200px] px-3 sm:px-5 md:px-8">
        {/* Title + stepper */}
        <div className="mb-4 sm:mb-6">
          <p className="text-sm font-bold text-pam-red">Checkout</p>
          <h1 className="mt-1 font-[family-name:var(--font-oswald)] text-[1.65rem] leading-tight text-pam-ink sm:text-3xl md:text-4xl">
            {fulfillment === "pickup" ? "Pickup & payment" : "Delivery & payment"}
          </h1>

          <div className="mt-4 flex items-center gap-1.5 sm:mt-5 sm:gap-2">
            {steps.map((s, i) => (
              <div key={s.id} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold sm:h-8 sm:w-8 sm:text-xs ${
                    i <= activeStepIndex
                      ? "bg-pam-red text-white"
                      : "bg-white text-pam-muted ring-1 ring-pam-border"
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`truncate text-[10px] font-bold sm:text-xs ${
                    i <= activeStepIndex ? "text-pam-ink" : "text-pam-muted"
                  }`}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div
                    className={`mx-0.5 h-px min-w-[8px] flex-1 sm:mx-0 ${
                      i < activeStepIndex ? "bg-pam-red" : "bg-pam-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.85fr)] lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.78fr)]">
          <div className="min-w-0 space-y-4">
            {error && (
              <div className="rounded-2xl bg-pam-red/10 px-4 py-3 text-sm font-medium text-pam-red">
                {error}
              </div>
            )}
            {!payReady && (
              <div className="rounded-2xl bg-pam-gold-soft px-4 py-3 text-sm font-medium text-pam-ink">
                Online payment is not connected yet. Checkout is disabled until{" "}
                <span className="font-bold">XENTRIPAY_API_KEY</span> is set on
                the server.
              </div>
            )}
            {checkoutBlock && (
              <div className="rounded-2xl bg-pam-gold-soft px-4 py-3 text-sm font-medium text-pam-ink">
                {checkoutBlock}
              </div>
            )}

            {step === "details" && (
              <div className="soft-card rounded-[1.35rem] border border-pam-border/70 bg-white p-4 sm:rounded-[1.75rem] sm:p-6 md:p-7">
                <h2 className="font-[family-name:var(--font-oswald)] text-xl sm:text-2xl">
                  {fulfillment === "pickup"
                    ? "Pickup details"
                    : "Where should we deliver?"}
                </h2>
                <p className="mt-1 text-sm text-pam-muted">
                  {fulfillment === "pickup"
                    ? "We’ll have your order ready at the shop. No delivery fee."
                    : "Tell us your location in Kigali - then choose how to pay."}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => chooseFulfillment("delivery")}
                    className={`rounded-2xl border px-3 py-3 text-left ${
                      fulfillment === "delivery"
                        ? "border-pam-red bg-pam-red/[0.06]"
                        : "border-pam-border bg-pam-sand/40"
                    }`}
                  >
                    <ScooterIcon className="h-4 w-4 text-pam-red" />
                    <p className="mt-1 text-sm font-extrabold">Delivery</p>
                    <p className="text-[11px] text-pam-muted">
                      {area
                        ? formatPrice(deliveryFee)
                        : `From ${formatPrice(deliveryFrom)}`}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseFulfillment("pickup")}
                    className={`rounded-2xl border px-3 py-3 text-left ${
                      fulfillment === "pickup"
                        ? "border-pam-red bg-pam-red/[0.06]"
                        : "border-pam-border bg-pam-sand/40"
                    }`}
                  >
                    <HomeIcon className="h-4 w-4 text-pam-red" />
                    <p className="mt-1 text-sm font-extrabold">Pickup</p>
                    <p className="text-[11px] text-pam-muted">No delivery fee</p>
                  </button>
                </div>

                <div className="mt-5 space-y-4 sm:mt-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold">
                        Full name
                      </label>
                      <div className="relative">
                        <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-muted" />
                        <input
                          className="input-field input-with-icon rounded-2xl"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          autoComplete="name"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold">
                        Phone
                      </label>
                      <div className="relative">
                        <PhoneIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-muted" />
                        <input
                          className="input-field input-with-icon rounded-2xl"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+250 7XX XXX XXX"
                          inputMode="tel"
                          autoComplete="tel"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold">
                        Email for receipt
                      </label>
                      <div className="relative">
                        <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-muted" />
                        <input
                          className="input-field input-with-icon rounded-2xl"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@email.com"
                          autoComplete="email"
                        />
                      </div>
                    </div>
                  </div>

                  {fulfillment === "delivery" && (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-semibold">
                          Your area / sector
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {areaFees.map((item) => {
                            const fee = resolveDeliveryFeeForArea(
                              areaFees,
                              item.area,
                              defaultDeliveryFee,
                            );
                            return (
                            <button
                              key={item.area}
                              type="button"
                              onClick={() => setArea(item.area)}
                              className={`rounded-full px-3 py-2 text-left transition sm:px-3.5 ${
                                area === item.area
                                  ? "bg-pam-red text-white"
                                  : "bg-pam-sand text-pam-ink"
                              }`}
                            >
                              <span className="block text-[11px] font-bold sm:text-xs">
                                {item.area}
                              </span>
                              <span
                                className={`block text-[10px] ${
                                  area === item.area
                                    ? "text-white/85"
                                    : "text-pam-muted"
                                }`}
                              >
                                {formatPrice(fee)}
                              </span>
                            </button>
                            );
                          })}
                        </div>
                        {!area ? (
                          <p className="mt-2 text-xs text-pam-muted">
                            Pick your area to see the exact delivery fee.
                          </p>
                        ) : (
                          <p className="mt-2 text-xs font-semibold text-pam-ink">
                            Delivery to {area}: {formatPrice(deliveryFee)}
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl border-2 border-dashed border-pam-red/30 bg-pam-red/5 p-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-pam-red ring-1 ring-pam-red/20">
                            <PinIcon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-pam-ink">
                              Share your live location
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-pam-muted">
                              Optional, but helpful. We use your GPS pin to find
                              your door faster - still pick your area and street
                              below.
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={shareLiveLocation}
                            disabled={locating}
                            className="rounded-xl bg-pam-red px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                          >
                            {locating
                              ? "Getting live location…"
                              : coords
                                ? "Update live location"
                                : "Share live location"}
                          </button>
                          {coords && (
                            <>
                              <a
                                href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-pam-ink ring-1 ring-pam-border"
                              >
                                Open in Maps
                              </a>
                              <button
                                type="button"
                                onClick={clearLiveLocation}
                                className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-pam-muted ring-1 ring-pam-border"
                              >
                                Remove pin
                              </button>
                            </>
                          )}
                        </div>

                        {locationOk && (
                          <p className="mt-3 text-xs font-semibold text-pam-basil">
                            {locationOk}
                          </p>
                        )}
                        {coords && (
                          <div className="mt-3 rounded-xl bg-white px-3 py-2.5 text-xs text-pam-ink ring-1 ring-pam-border/70">
                            <p className="font-bold text-pam-basil">
                              Live GPS pinned
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-pam-muted">
                              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                              {coords.accuracy
                                ? ` · ±${Math.round(coords.accuracy)}m`
                                : ""}
                            </p>
                            {locationLabel ? (
                              <p className="mt-1 text-[11px] leading-snug text-pam-ink/80">
                                Near {locationLabel}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold">
                          Street / house / building
                        </label>
                        <div className="relative">
                          <PinIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-muted" />
                          <input
                            className="input-field input-with-icon rounded-2xl"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            placeholder="e.g. KG 11 Ave, house 24, blue gate"
                            autoComplete="street-address"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold">
                          Landmark (optional)
                        </label>
                        <div className="relative">
                          <HomeIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-muted" />
                          <input
                            className="input-field input-with-icon rounded-2xl"
                            value={landmark}
                            onChange={(e) => setLandmark(e.target.value)}
                            placeholder="Near MTN Centre, opposite pharmacy…"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={goToPay}
                    className="hidden w-full rounded-2xl bg-pam-red py-3.5 text-sm font-bold text-white active:scale-[0.99] md:block"
                  >
                    Continue to payment →
                  </button>
                </div>
              </div>
            )}

            {(step === "pay" || step === "confirming") && (
              <div className="space-y-4">
                <div className="soft-card rounded-[1.35rem] border border-pam-border/70 bg-white p-4 sm:rounded-[1.75rem] sm:p-6 md:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <h2 className="font-[family-name:var(--font-oswald)] text-xl sm:text-2xl">
                        Choose how to pay
                      </h2>
                      <p className="mt-1 text-sm text-pam-muted">
                        Card, Airtel Money, or MoMo - charged securely with
                        XentriPay.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep("details")}
                      className="text-sm font-bold text-pam-red"
                    >
                      ← Location
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2.5 sm:mt-5 sm:grid-cols-3 sm:gap-3">
                    {PAY_OPTIONS.map((opt) => {
                      const selected = paymentMethod === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={step === "confirming"}
                          onClick={() => {
                            setPaymentMethod(opt.id);
                            setError("");
                          }}
                          className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition sm:block sm:p-4 ${
                            selected
                              ? "border-pam-red bg-pam-red/[0.04] shadow-[0_10px_30px_rgba(227,24,55,0.12)]"
                              : "border-pam-border bg-pam-sand/30"
                          }`}
                        >
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold text-white ${opt.accent}`}
                          >
                            {opt.badge}
                          </span>
                          <div className="min-w-0 sm:mt-3">
                            <p className="text-sm font-extrabold text-pam-ink">
                              {opt.title}
                            </p>
                            <p className="mt-0.5 text-[11px] text-pam-muted sm:mt-1">
                              {opt.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-pam-border bg-white p-4 sm:p-6 md:p-7">
                  {paymentMethod === "card" && (
                    <div>
                      <p className="text-xs font-bold text-pam-muted">
                        Card payment
                      </p>
                      <h3 className="mt-2 font-[family-name:var(--font-oswald)] text-xl text-pam-ink sm:text-2xl">
                        Pay {formatPrice(total)}
                      </h3>
                      <p className="mt-2 text-sm text-pam-muted">
                        You’ll be redirected to a secure card page (Visa /
                        Mastercard). We never collect your card number on this
                        site.
                      </p>
                    </div>
                  )}

                  {paymentMethod === "airtel" && (
                    <div>
                      <p className="text-xs font-bold text-pam-muted">
                        Airtel Money
                      </p>
                      <h3 className="mt-2 font-[family-name:var(--font-oswald)] text-xl text-pam-ink sm:text-2xl">
                        Confirm {formatPrice(total)}
                      </h3>
                      <p className="mt-2 text-sm text-pam-muted">
                        You’ll get an Airtel Money prompt on this number. Approve
                        it on your phone - never type your PIN here.
                      </p>
                      <div className="mt-5 space-y-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-white/75">
                            Airtel number
                          </label>
                          <div className="relative">
                            <PhoneIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-muted" />
                            <input
                              className="input-field input-with-icon rounded-2xl border-0 bg-white py-3 text-sm font-semibold text-pam-ink"
                              placeholder="07X XXX XXXX"
                              value={momoPhone}
                              disabled={step === "confirming"}
                              onChange={(e) => setMomoPhone(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "momo" && (
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-pam-muted">
                            MTN MoMo
                          </p>
                          <h3 className="mt-2 font-[family-name:var(--font-oswald)] text-xl text-pam-ink sm:text-2xl">
                            Pay {formatPrice(total)}
                          </h3>
                        </div>
                        <span className="shrink-0 rounded-full bg-pam-ink px-3 py-1.5 text-[11px] font-bold text-[#ffcc00]">
                          *182#
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-pam-muted">
                        Approve the MoMo push on your MTN line, or dial *182*7*1#
                        if needed. Do not enter your PIN on this website.
                      </p>
                      <div className="mt-5 space-y-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-pam-muted">
                            MoMo number
                          </label>
                          <div className="relative">
                            <PhoneIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-ink/45" />
                            <input
                              className="input-field input-with-icon rounded-2xl border-0 bg-white py-3 text-sm font-semibold text-pam-ink ring-1 ring-pam-ink/10"
                              placeholder="078 XXX XXXX"
                              value={momoPhone}
                              disabled={step === "confirming"}
                              onChange={(e) => setMomoPhone(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === "confirming" && (
                    <div className="mt-5">
                      <div className="h-2 overflow-hidden rounded-full bg-pam-sand">
                        <div
                          className="h-full rounded-full bg-pam-red transition-all duration-300"
                          style={{ width: `${payProgress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs font-bold text-pam-muted">
                        {payHint || `Confirming payment… ${payProgress}%`}
                      </p>
                    </div>
                  )}

                  {step === "pay" && (
                    <button
                      type="button"
                      disabled={loading || !canCheckout}
                      onClick={() => void placeOrder()}
                      className={`mt-5 hidden w-full rounded-lg py-3.5 text-sm font-bold disabled:opacity-70 md:mt-6 md:block ${
                        paymentMethod === "momo"
                          ? "bg-pam-ink text-[#ffcc00]"
                          : "bg-pam-red text-white"
                      }`}
                    >
                      Pay {formatPrice(total)} now
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Compact summary on phones only (sidebar handles md+) */}
            <details
              open
              className="soft-card rounded-[1.35rem] border border-pam-border/70 bg-white p-4 open:pb-4 md:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-wide text-pam-muted uppercase">
                    Order summary · {items.length} item
                    {items.length === 1 ? "" : "s"}
                  </p>
                  <p className="truncate text-sm font-semibold text-pam-ink">
                    {items[0]?.name || "Empty cart"}
                    {items.length > 1 ? ` +${items.length - 1}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-[family-name:var(--font-oswald)] text-lg text-pam-ink">
                    {formatPrice(total)}
                  </span>
                  <span className="text-pam-muted" aria-hidden>
                    ▾
                  </span>
                </div>
              </summary>
              <div className="mt-3 border-t border-pam-border pt-3">
                <div className="mb-2 flex justify-end">
                  <Link href="/cart" className="text-xs font-bold text-pam-red">
                    Edit cart
                  </Link>
                </div>
                {renderSummaryBody(true)}
              </div>
            </details>
          </div>

          <aside className="soft-card sticky top-24 hidden h-fit min-w-0 rounded-[1.75rem] border border-pam-border/70 bg-white p-5 md:block">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-[family-name:var(--font-oswald)] text-xl">
                Order summary
              </h2>
              <Link href="/cart" className="text-sm font-bold text-pam-red">
                Edit cart
              </Link>
            </div>
            {renderSummaryBody()}
          </aside>
        </div>
      </div>

      {/* Mobile sticky CTA above bottom nav */}
      {(step === "details" || step === "pay") && (
        <div className="fixed inset-x-0 bottom-[calc(4.85rem+env(safe-area-inset-bottom))] z-40 border-t border-pam-border/80 bg-white/95 px-3 py-2.5 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-pam-muted uppercase">
                Total
              </p>
              <p className="truncate font-[family-name:var(--font-oswald)] text-lg text-pam-ink">
                {formatPrice(total)}
              </p>
            </div>
            {step === "details" ? (
              <button
                type="button"
                onClick={goToPay}
                disabled={!canCheckout}
                className="shrink-0 rounded-2xl bg-pam-red px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                disabled={loading || !canCheckout}
                onClick={() => void placeOrder()}
                className="shrink-0 rounded-2xl bg-pam-red px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
              >
                Pay now
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
