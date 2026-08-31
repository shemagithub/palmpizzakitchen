"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import MenuImageField from "@/components/admin/MenuImageField";
import PromoSizeFields from "@/components/admin/PromoSizeFields";
import { PromoSizePriceRowLight } from "@/components/PromoSizePriceRow";
import {
  AdminAlert,
  AdminCard,
  AdminHelpTip,
  AdminPageHeader,
  AdminSkeleton,
} from "@/components/admin/AdminUI";
import { statusTone } from "@/data/admin";
import { getEnabledSizes, type MenuItem } from "@/data/menu";
import { api, resolveMediaUrl } from "@/lib/api";
import {
  buildPromoSizePrices,
  DEAL_TEMPLATES,
  ELIGIBLE_CATEGORY_OPTIONS,
  OFFER_TYPE_OPTIONS,
  promoSizeFormFromRecord,
  validateOfferForm,
  hasOfferPromoPricing,
  type OfferRecord,
  type OfferType,
  type PromoSizeForm,
} from "@/lib/offers";

type Offer = OfferRecord;

type OfferForm = {
  id: string;
  title: string;
  code: string;
  status: "Active" | "Scheduled" | "Paused";
  ends: string;
  description: string;
  dealLabel: string;
  terms: string;
  href: string;
  image: string;
  showOnHome: boolean;
  menuItemId: string;
  offerType: OfferType;
  eligibleCategories: string[];
  sizeForm: PromoSizeForm;
};

const EMPTY_FORM: OfferForm = {
  id: "",
  title: "",
  code: "",
  status: "Active",
  ends: "",
  description: "",
  dealLabel: "",
  terms: "",
  href: "/pizzas",
  image: "",
  showOnHome: true,
  menuItemId: "",
  offerType: "general",
  eligibleCategories: [],
  sizeForm: {
    sizesEnabled: false,
    priceMode: "per_size" as const,
    priceFlat: "",
    priceSmall: "",
    priceMedium: "",
    priceLarge: "",
  },
};

const FILTERS = ["All", "Active", "Scheduled", "Paused"] as const;

function formatWhen(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [query, setQuery] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OfferForm>(EMPTY_FORM);

  const [viewOffer, setViewOffer] = useState<Offer | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ offers: Offer[] }>("/offers/all");
      setOffers(data.offers);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load offers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    api<{ items: MenuItem[] }>("/menu")
      .then((data) => setMenuItems(data.items || []))
      .catch(() => setMenuItems([]));
  }, [load]);

  const copySizesFromMenu = () => {
    const item = menuItems.find((row) => row.id === form.menuItemId);
    if (!item) {
      setError("Pick a menu item first, then copy its prices.");
      return;
    }
    const sizes = getEnabledSizes(item);
    if (!sizes) {
      setForm((f) => ({
        ...f,
        sizeForm: {
          sizesEnabled: true,
          priceMode: "flat",
          priceFlat: String(item.price || ""),
          priceSmall: "",
          priceMedium: "",
          priceLarge: "",
        },
        href: f.href || `/product/${item.id}`,
      }));
      setError("");
      return;
    }
    setForm((f) => ({
      ...f,
      sizeForm: {
        ...promoSizeFormFromRecord(sizes),
        priceMode: "per_size",
      },
      href: f.href || `/product/${item.id}`,
    }));
    setError("");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return offers.filter((offer) => {
      if (filter !== "All" && offer.status !== filter) return false;
      if (!q) return true;
      return (
        offer.title.toLowerCase().includes(q) ||
        offer.code.toLowerCase().includes(q) ||
        (offer.description || "").toLowerCase().includes(q)
      );
    });
  }, [offers, filter, query]);

  const openCreate = (templateIndex?: number) => {
    setEditingId(null);
    if (templateIndex != null && DEAL_TEMPLATES[templateIndex]) {
      const t = DEAL_TEMPLATES[templateIndex];
      setForm({
        ...EMPTY_FORM,
        title: t.title,
        code: t.code,
        description: t.description,
        dealLabel: t.dealLabel,
        terms: t.terms,
        href: t.href,
        image: t.image,
        ends: "Ongoing",
        offerType: t.offerType || "general",
        eligibleCategories: t.eligibleCategories || [],
        sizeForm:
          t.id === "bogo-burger"
            ? {
                sizesEnabled: true,
                priceMode: "flat",
                priceFlat: "5500",
                priceSmall: "",
                priceMedium: "",
                priceLarge: "",
              }
            : t.id === "bogo-pizza" || t.id === "weekday-lunch"
              ? {
                  sizesEnabled: true,
                  priceMode: "per_size",
                  priceFlat: "",
                  priceSmall: "",
                  priceMedium: "10000",
                  priceLarge: "12000",
                }
              : EMPTY_FORM.sizeForm,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setEditorOpen(true);
    setError("");
    setOk("");
  };

  const openEdit = (offer: Offer) => {
    setEditingId(offer.id);
    setForm({
      id: offer.id,
      title: offer.title,
      code: offer.code,
      status: (["Active", "Scheduled", "Paused"].includes(offer.status)
        ? offer.status
        : "Active") as OfferForm["status"],
      ends: offer.ends,
      description: offer.description || "",
      dealLabel: offer.dealLabel || "",
      terms: offer.terms || "",
      href: offer.href || "/pizzas",
      image: offer.image || "",
      showOnHome: offer.showOnHome !== false,
      menuItemId: offer.menuItemId || "",
      offerType: (offer.offerType || "general") as OfferType,
      eligibleCategories: offer.eligibleCategories || [],
      sizeForm: promoSizeFormFromRecord(offer.sizePrices),
    });
    setViewOffer(null);
    setEditorOpen(true);
    setError("");
    setOk("");
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setOk("");
    try {
      if (!form.title.trim() || !form.code.trim() || !form.ends.trim()) {
        throw new Error("Title, promo code, and end date are required.");
      }
      const formError = validateOfferForm({
        offerType: form.offerType,
        eligibleCategories: form.eligibleCategories,
        sizeForm: form.sizeForm,
      });
      if (formError) throw new Error(formError);

      const payload = {
        title: form.title.trim(),
        code: form.code.trim().toUpperCase(),
        status: form.status,
        ends: form.ends.trim(),
        description: form.description.trim(),
        dealLabel: form.dealLabel.trim(),
        terms: form.terms.trim(),
        href: form.href.trim() || "/pizzas",
        image: form.image.trim(),
        showOnHome: form.showOnHome,
        menuItemId: form.menuItemId.trim() || null,
        sizePrices: buildPromoSizePrices(form.sizeForm),
        offerType: form.offerType,
        eligibleCategories: form.eligibleCategories,
      };

      if (editingId) {
        await api(`/offers/${encodeURIComponent(editingId)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setOk("Offer updated.");
      } else {
        await api("/offers", {
          method: "POST",
          body: JSON.stringify({
            id: form.id.trim() || undefined,
            ...payload,
          }),
        });
        setOk("Offer created.");
      }
      closeEditor();
      await load();
      window.setTimeout(() => setOk(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (offer: Offer) => {
    const confirmed = window.confirm(
      `Delete “${offer.title}” (${offer.code})? Customers will no longer see this deal.`,
    );
    if (!confirmed) return;
    setError("");
    setOk("");
    try {
      await api(`/offers/${encodeURIComponent(offer.id)}`, {
        method: "DELETE",
      });
      if (viewOffer?.id === offer.id) setViewOffer(null);
      setOk("Offer deleted.");
      await load();
      window.setTimeout(() => setOk(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  const setStatusQuick = async (offer: Offer, status: OfferForm["status"]) => {
    setError("");
    try {
      await api(`/offers/${encodeURIComponent(offer.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
      if (viewOffer?.id === offer.id) {
        setViewOffer({ ...offer, status });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    }
  };

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Food & deals"
        title="Promotions & offers"
        subtitle="Create deals like Buy 1 Get 1 Free burgers — upload a photo, set the promo code, and show it on the homepage."
        actions={
          <>
            <Link
              href="/offers"
              target="_blank"
              className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
            >
              See on website
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
            >
              Refresh list
            </button>
            <button
              type="button"
              onClick={() => openCreate()}
              className="rounded-xl bg-pam-red px-3.5 py-2.5 text-sm font-bold text-white"
            >
              + Add offer
            </button>
          </>
        }
      />

      <AdminHelpTip title="How to add a promotion" dismissKey="offers">
        Use a <strong>template</strong> (e.g. Buy 1 burger get 1 free), upload a
        promo photo, write what the customer gets, and tick{" "}
        <strong>Show on homepage</strong>. Active offers appear on the home page
        and on <Link href="/offers" className="font-bold text-pam-red">/offers</Link>.
      </AdminHelpTip>

      <div className="mb-4 flex flex-wrap gap-2">
        {DEAL_TEMPLATES.map((template, i) => (
          <button
            key={template.id}
            type="button"
            onClick={() => openCreate(i)}
            className="rounded-full bg-white px-3 py-2 text-xs font-bold text-pam-ink ring-1 ring-pam-border hover:bg-pam-red/10"
          >
            + {template.label}
          </button>
        ))}
      </div>

      {error && <AdminAlert>{error}</AdminAlert>}
      {ok && <AdminAlert tone="ok">{ok}</AdminAlert>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold transition ${
                filter === item
                  ? "bg-pam-red text-white"
                  : "bg-white text-pam-muted ring-1 ring-pam-border"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or code…"
          className="input-field max-w-full rounded-2xl sm:max-w-xs"
        />
      </div>

      {loading ? (
        <AdminSkeleton rows={3} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {filtered.map((offer) => (
            <AdminCard key={offer.id} className="flex flex-col overflow-hidden p-0">
              {offer.image ? (
                <div className="relative aspect-[16/10] bg-pam-sand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveMediaUrl(offer.image)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {offer.dealLabel ? (
                    <span className="absolute left-3 top-3 rounded-full bg-pam-gold px-2.5 py-1 text-[10px] font-bold text-pam-ink uppercase">
                      {offer.dealLabel}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-1 flex-col p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold tracking-wide text-pam-muted uppercase">
                    {offer.id}
                  </p>
                  <h2 className="mt-1 font-[family-name:var(--font-oswald)] text-xl leading-tight">
                    {offer.title}
                  </h2>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(offer.status)}`}
                >
                  {offer.status}
                </span>
              </div>

              <p className="mt-3 inline-flex w-fit rounded-xl bg-pam-sand px-3 py-1.5 font-mono text-sm font-bold tracking-wide">
                {offer.code}
              </p>
              {offer.offerType && offer.offerType !== "general" ? (
                <p className="mt-2 text-xs font-bold text-pam-red uppercase">
                  {offer.offerType === "bogo"
                    ? "Buy 1 · Get 1 — customer picks products"
                    : "Fixed promo price — customer picks product"}
                </p>
              ) : null}
              <p className="mt-3 line-clamp-2 text-sm text-pam-muted">
                {offer.description || "No description yet."}
              </p>
              {hasOfferPromoPricing(offer) ? (
                <div className="mt-3">
                  <PromoSizePriceRowLight sizes={offer.sizePrices} />
                </div>
              ) : null}
              <p className="mt-3 text-xs text-pam-muted">
                Ends · {offer.ends}
                {offer.showOnHome === false ? " · Hidden from home" : " · On homepage"}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setViewOffer(offer)}
                  className="rounded-xl bg-pam-ink px-3 py-2 text-xs font-bold text-white"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(offer)}
                  className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-pam-ink ring-1 ring-pam-border"
                >
                  Edit
                </button>
                {offer.status !== "Paused" ? (
                  <button
                    type="button"
                    onClick={() => void setStatusQuick(offer, "Paused")}
                    className="rounded-xl bg-pam-sand px-3 py-2 text-xs font-bold text-pam-ink"
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void setStatusQuick(offer, "Active")}
                    className="rounded-xl bg-pam-basil/15 px-3 py-2 text-xs font-bold text-pam-basil"
                  >
                    Activate
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void remove(offer)}
                  className="rounded-xl bg-pam-red/10 px-3 py-2 text-xs font-bold text-pam-red"
                >
                  Delete
                </button>
              </div>
              </div>
            </AdminCard>
          ))}
          {!filtered.length && (
            <p className="col-span-full py-10 text-center text-sm text-pam-muted">
              No offers match. Try another filter, or add a new offer.
            </p>
          )}
        </div>
      )}

      {viewOffer && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close offer details"
            className="absolute inset-0 bg-black/50"
            onClick={() => setViewOffer(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-[91] max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-wide text-pam-red uppercase">
                  Offer details
                </p>
                <h3 className="mt-1 font-[family-name:var(--font-oswald)] text-2xl text-pam-ink">
                  {viewOffer.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewOffer(null)}
                className="rounded-xl bg-pam-sand px-3 py-2 text-sm font-bold"
              >
                Close
              </button>
            </div>

            <dl className="space-y-3 rounded-2xl border border-pam-border/70 bg-pam-sand/30 p-4">
              <div className="flex justify-between gap-3">
                <dt className="text-xs font-bold text-pam-muted uppercase">
                  Status
                </dt>
                <dd>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(viewOffer.status)}`}
                  >
                    {viewOffer.status}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-xs font-bold text-pam-muted uppercase">
                  Promo code
                </dt>
                <dd className="font-mono text-sm font-bold">{viewOffer.code}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-xs font-bold text-pam-muted uppercase">
                  Ends
                </dt>
                <dd className="text-sm font-semibold text-pam-ink">
                  {viewOffer.ends}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-xs font-bold text-pam-muted uppercase">
                  Offer id
                </dt>
                <dd className="text-sm font-semibold text-pam-ink">
                  {viewOffer.id}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-xs font-bold text-pam-muted uppercase">
                  Created
                </dt>
                <dd className="text-sm font-semibold text-pam-ink">
                  {formatWhen(viewOffer.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-pam-muted uppercase">
                  Description
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-pam-ink">
                  {viewOffer.description || "No description."}
                </dd>
              </div>
              {viewOffer && hasOfferPromoPricing(viewOffer) ? (
                <div>
                  <dt className="text-xs font-bold text-pam-muted uppercase">
                    Promo prices
                  </dt>
                  <dd className="mt-2">
                    <PromoSizePriceRowLight sizes={viewOffer.sizePrices} />
                  </dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openEdit(viewOffer)}
                className="rounded-xl bg-pam-red px-4 py-2.5 text-sm font-bold text-white"
              >
                Edit offer
              </button>
              <button
                type="button"
                onClick={() => void remove(viewOffer)}
                className="rounded-xl bg-pam-red/10 px-4 py-2.5 text-sm font-bold text-pam-red"
              >
                Delete
              </button>
              <Link
                href="/offers"
                target="_blank"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
              >
                Preview page
              </Link>
            </div>
          </div>
        </div>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close editor"
            className="absolute inset-0 bg-black/50"
            onClick={closeEditor}
          />
          <div className="relative z-[91] max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-wide text-pam-red uppercase">
                  {editingId ? "Update offer" : "New offer"}
                </p>
                <h3 className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink">
                  {editingId ? "Edit discount offer" : "Add discount offer"}
                </h3>
                <p className="text-xs text-pam-muted">
                  Active and Scheduled offers show on the website. Paused ones
                  are hidden.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-xl bg-pam-sand px-3 py-2 text-sm font-bold"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              {!editingId && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Custom ID (optional)
                  </label>
                  <input
                    className="input-field rounded-2xl"
                    value={form.id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, id: e.target.value }))
                    }
                    placeholder="auto-from-title"
                  />
                </div>
              )}

              <MenuImageField
                label="Promotion photo"
                value={form.image}
                onChange={(url) => setForm((f) => ({ ...f, image: url }))}
                onError={setError}
              />

              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Deal highlight
                </label>
                <input
                  className="input-field rounded-2xl"
                  value={form.dealLabel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dealLabel: e.target.value }))
                  }
                  placeholder="Buy 1 · Get 1 Free"
                />
                <p className="mt-1 text-[11px] text-pam-muted">
                  Short badge customers see first — e.g. BOGO, Free delivery.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Title
                </label>
                <input
                  className="input-field rounded-2xl"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Burger BOGO — Buy 1 Get 1 Free"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Promo code
                  </label>
                  <input
                    className="input-field rounded-2xl uppercase"
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="FAMILY30"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Status
                  </label>
                  <select
                    className="input-field rounded-2xl"
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        status: e.target.value as OfferForm["status"],
                      }))
                    }
                  >
                    <option value="Active">Active</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Paused">Paused</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Ends / valid until
                </label>
                <input
                  className="input-field rounded-2xl"
                  value={form.ends}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ends: e.target.value }))
                  }
                  placeholder="Aug 31, 2026 or Ongoing"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Offer type
                </label>
                <select
                  className="input-field rounded-2xl"
                  value={form.offerType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      offerType: e.target.value as OfferType,
                    }))
                  }
                >
                  {OFFER_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-pam-muted">
                  {
                    OFFER_TYPE_OPTIONS.find((o) => o.id === form.offerType)
                      ?.hint
                  }
                </p>
              </div>

              {(form.offerType === "bogo" ||
                form.offerType === "fixed_price") && (
                <div className="rounded-2xl border border-pam-border bg-pam-sand/30 p-4">
                  <p className="text-sm font-semibold text-pam-ink">
                    Which products can customers pick?
                  </p>
                  <p className="mt-1 text-xs text-pam-muted">
                    Names come from your menu. Tick the categories included in
                    this deal.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {ELIGIBLE_CATEGORY_OPTIONS.map((cat) => {
                      const checked = form.eligibleCategories.includes(cat.id);
                      return (
                        <label
                          key={cat.id}
                          className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-pam-border/80"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setForm((f) => ({
                                ...f,
                                eligibleCategories: checked
                                  ? f.eligibleCategories.filter(
                                      (c) => c !== cat.id,
                                    )
                                  : [...f.eligibleCategories, cat.id],
                              }));
                            }}
                          />
                          <span>{cat.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Linked menu item (optional)
                </label>
                <select
                  className="input-field rounded-2xl"
                  value={form.menuItemId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, menuItemId: e.target.value }))
                  }
                >
                  <option value="">None — general promo</option>
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-pam-muted">
                  {form.offerType === "general"
                    ? "General promos use this link when customers tap Order."
                    : "Optional — copy size prices from a menu item, or enter promo prices below."}
                </p>
              </div>

              <PromoSizeFields
                form={form.sizeForm}
                onChange={(sizeForm) => setForm((f) => ({ ...f, sizeForm }))}
                burgerStyle={
                  form.eligibleCategories.length === 1 &&
                  form.eligibleCategories[0] === "burger"
                }
                onCopyFromMenu={
                  form.menuItemId ? () => copySizesFromMenu() : undefined
                }
              />

              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  What customers get
                </label>
                <textarea
                  className="input-field min-h-24 rounded-2xl"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Order any burger and get a second burger free…"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Terms (optional)
                </label>
                <textarea
                  className="input-field min-h-20 rounded-2xl"
                  value={form.terms}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, terms: e.target.value }))
                  }
                  placeholder="Same burger or equal value. One per order."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Order button goes to
                </label>
                <input
                  className="input-field rounded-2xl"
                  value={form.href}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, href: e.target.value }))
                  }
                  placeholder="/burgers"
                />
                <p className="mt-1 text-[11px] text-pam-muted">
                  Examples: /burgers · /pizzas · /combos
                </p>
              </div>
              <label className="flex items-start gap-2 rounded-2xl border border-pam-border bg-pam-sand/40 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={form.showOnHome}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, showOnHome: e.target.checked }))
                  }
                />
                <span>
                  <strong>Show on homepage</strong> — appears in the &quot;Today&apos;s
                  deals&quot; row under the top banner.
                </span>
              </label>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="rounded-xl bg-pam-red px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {saving
                    ? "Saving…"
                    : editingId
                      ? "Save changes"
                      : "Create offer"}
                </button>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
