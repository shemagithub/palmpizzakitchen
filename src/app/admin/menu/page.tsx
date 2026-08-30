"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import MenuGalleryField from "@/components/admin/MenuGalleryField";
import {
  AdminAlert,
  AdminCard,
  AdminHelpTip,
  AdminPageHeader,
  AdminSkeleton,
} from "@/components/admin/AdminUI";
import { formatPrice, getEnabledSizes, type ProductDetails } from "@/data/menu";
import { api, resolveMediaUrl } from "@/lib/api";

type Item = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  images?: string[];
  category: string;
  badge?: string;
  rating?: number;
  reviews?: number;
  details?: Partial<ProductDetails>;
  active: boolean;
};

type FormState = {
  id: string;
  name: string;
  description: string;
  price: string;
  images: string[];
  category: string;
  badge: string;
  rating: string;
  reviews: string;
  prepTime: string;
  serves: string;
  calories: string;
  longDescription: string;
  ingredients: string;
  allergens: string;
  highlights: string;
  sizesEnabled: boolean;
  priceSmall: string;
  priceMedium: string;
  priceLarge: string;
  active: boolean;
};

const CATEGORIES = [
  "classic",
  "cheese",
  "veggie",
  "meat",
  "side",
  "drink",
  "burger",
  "combo",
] as const;

const FILTERS = ["All", ...CATEGORIES, "Hidden"] as const;

const EMPTY_FORM: FormState = {
  id: "",
  name: "",
  description: "",
  price: "",
  images: [],
  category: "classic",
  badge: "",
  rating: "4.8",
  reviews: "0",
  prepTime: "",
  serves: "",
  calories: "",
  longDescription: "",
  ingredients: "",
  allergens: "",
  highlights: "",
  sizesEnabled: false,
  priceSmall: "",
  priceMedium: "",
  priceLarge: "",
  active: true,
};

function linesToText(list?: string[]) {
  return (list || []).join("\n");
}

function textToLines(value: string) {
  return value
    .split(/\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function suggestedSizePrices(basePrice: number) {
  const base = Math.max(0, Math.round(Number(basePrice) || 0));
  if (!base) {
    return { priceSmall: "", priceMedium: "", priceLarge: "" };
  }
  const round100 = (n: number) => String(Math.max(100, Math.round(n / 100) * 100));
  return {
    priceSmall: round100(base * 0.85),
    priceMedium: String(base),
    priceLarge: round100(base * 1.25),
  };
}

const PIZZA_CATEGORIES = new Set(["classic", "cheese", "veggie", "meat"]);

function toForm(item?: Item | null): FormState {
  if (!item) return { ...EMPTY_FORM };
  const gallery = Array.from(
    new Set([item.image, ...(item.images || [])].filter(Boolean)),
  );
  const d = item.details || {};
  const sizes = d.sizes;
  const sizeOn = Boolean(sizes?.enabled);
  const base = String(Math.round(item.price));
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: base,
    images: gallery,
    category: item.category,
    badge: item.badge || "",
    rating: String(item.rating ?? 4.8),
    reviews: String(item.reviews ?? 0),
    prepTime: d.prepTime || "",
    serves: d.serves || "",
    calories: d.calories || "",
    longDescription: d.longDescription || "",
    ingredients: linesToText(d.ingredients),
    allergens: linesToText(d.allergens),
    highlights: linesToText(d.highlights),
    sizesEnabled: sizeOn,
    priceSmall:
      sizeOn && sizes?.s != null ? String(Math.round(Number(sizes.s) || 0)) : "",
    priceMedium:
      sizeOn && sizes?.m != null ? String(Math.round(Number(sizes.m) || 0)) : "",
    priceLarge:
      sizeOn && sizes?.l != null ? String(Math.round(Number(sizes.l) || 0)) : "",
    active: item.active,
  };
}

export default function AdminMenuPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof FILTERS)[number]>("All");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: Item[] }>("/menu/manage");
      setItems(data.items);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load menu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (cat === "Hidden" && item.active) return false;
      if (cat !== "All" && cat !== "Hidden" && item.category !== cat) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [items, query, cat]);

  const openCreate = () => {
    setEditingId(null);
    const suggested = suggestedSizePrices(12000);
    setForm({
      ...EMPTY_FORM,
      category: "classic",
      sizesEnabled: true,
      price: suggested.priceMedium,
      ...suggested,
    });
    setEditorOpen(true);
    setOk("");
    setError("");
  };

  const openEdit = (item: Item) => {
    setEditingId(item.id);
    const next = toForm(item);
    // Pizzas without sizes yet: open with size options ready to fill
    if (!next.sizesEnabled && PIZZA_CATEGORIES.has(item.category)) {
      const suggested = suggestedSizePrices(item.price);
      setForm({
        ...next,
        sizesEnabled: true,
        priceSmall: suggested.priceSmall,
        priceMedium: suggested.priceMedium || next.price,
        priceLarge: suggested.priceLarge,
      });
    } else {
      setForm(next);
    }
    setEditorOpen(true);
    setOk("");
    setError("");
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
      const images = form.images.map((u) => u.trim()).filter(Boolean);
      if (!form.name.trim() || !form.description.trim() || !images.length) {
        throw new Error("Name, description, and at least one photo are required.");
      }

      let price = Number(form.price);
      let sizes: ProductDetails["sizes"] | undefined;
      if (form.sizesEnabled) {
        const sRaw = form.priceSmall.trim();
        const mRaw = form.priceMedium.trim();
        const lRaw = form.priceLarge.trim();
        const s = sRaw === "" ? null : Number(sRaw);
        const m = mRaw === "" ? null : Number(mRaw);
        const l = lRaw === "" ? null : Number(lRaw);
        const valid = (n: number | null) =>
          n != null && Number.isFinite(n) && n >= 0;
        if (!valid(s) && !valid(m) && !valid(l)) {
          throw new Error(
            "Enter at least one size price (Small, Medium, or Large), or turn sizes off.",
          );
        }
        for (const [label, n, raw] of [
          ["Small", s, sRaw],
          ["Medium", m, mRaw],
          ["Large", l, lRaw],
        ] as const) {
          if (raw !== "" && !valid(n)) {
            throw new Error(`Enter a valid ${label} price in RWF.`);
          }
        }
        sizes = {
          enabled: true,
          ...(valid(s) ? { s: s as number } : {}),
          ...(valid(m) ? { m: m as number } : {}),
          ...(valid(l) ? { l: l as number } : {}),
        };
        price =
          (valid(m) ? (m as number) : null) ??
          (valid(s) ? (s as number) : null) ??
          (l as number);
      } else if (!Number.isFinite(price) || price < 0) {
        throw new Error("Enter a valid price in RWF.");
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        image: images[0],
        images,
        category: form.category,
        badge: form.badge.trim() || undefined,
        rating: Number(form.rating) || 4.8,
        reviews: Number(form.reviews) || 0,
        active: form.active ? 1 : 0,
        details: {
          prepTime: form.prepTime.trim(),
          serves: form.serves.trim(),
          calories: form.calories.trim(),
          longDescription: form.longDescription.trim(),
          ingredients: textToLines(form.ingredients),
          allergens: textToLines(form.allergens),
          highlights: textToLines(form.highlights),
          ...(sizes ? { sizes } : { sizes: { enabled: false } }),
        },
      };

      if (editingId) {
        await api(`/menu/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setOk("Menu item updated.");
      } else {
        await api("/menu", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            id: form.id.trim() || undefined,
          }),
        });
        setOk("Menu item created.");
      }
      closeEditor();
      window.dispatchEvent(new Event("palm-menu-updated"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: Item) => {
    try {
      await api(`/menu/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: item.active ? 0 : 1 }),
      });
      setOk(item.active ? "Item hidden from storefront." : "Item published.");
      window.dispatchEvent(new Event("palm-menu-updated"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    }
  };

  const askRemove = (item: Item) => {
    setError("");
    setPendingDelete(item);
  };

  const confirmRemove = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setError("");
    try {
      await api(`/menu/${pendingDelete.id}`, { method: "DELETE" });
      setOk(`“${pendingDelete.name}” deleted.`);
      if (editingId === pendingDelete.id) closeEditor();
      setPendingDelete(null);
      window.dispatchEvent(new Event("palm-menu-updated"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Food"
        title="Food menu"
        subtitle="Edit pizzas, sides, drinks, and combos - including gallery photos and product-page details."
        actions={
          <>
            <Link
              href="/burgers"
              target="_blank"
              className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
            >
              See burgers
            </Link>
            <Link
              href="/drinks"
              target="_blank"
              className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
            >
              See drinks
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
              onClick={openCreate}
              className="rounded-xl bg-pam-red px-3.5 py-2.5 text-sm font-bold text-white"
            >
              + Add item
            </button>
          </>
        }
      />

      <AdminHelpTip title="How to show Small / Medium / Large" dismissKey="menu-sizes">
        Edit a pizza, keep <strong>Sell by size</strong> turned ON, enter the three
        prices, then <strong>Save</strong>. Customers will see size buttons on the
        product page and the price updates when they pick Small, Medium, or Large.
      </AdminHelpTip>

      {error && <AdminAlert>{error}</AdminAlert>}
      {ok && <AdminAlert tone="ok">{ok}</AdminAlert>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold capitalize transition ${
                cat === c
                  ? "bg-pam-red text-white"
                  : "bg-white text-pam-muted ring-1 ring-pam-border"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="input-field max-w-full rounded-2xl sm:max-w-xs"
        />
      </div>

      {loading ? (
        <AdminSkeleton rows={4} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {filtered.map((item) => (
            <AdminCard
              key={item.id}
              className={`overflow-hidden ${!item.active ? "opacity-75" : ""}`}
            >
              <div className="relative aspect-[16/10] bg-pam-sand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveMediaUrl(item.image)}
                  alt={item.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  {item.badge && (
                    <span className="rounded-full bg-pam-red px-2.5 py-1 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      item.active
                        ? "bg-pam-basil text-white"
                        : "bg-pam-ink/80 text-white"
                    }`}
                  >
                    {item.active ? "Live" : "Hidden"}
                  </span>
                  {(item.images?.length || 0) > 1 && (
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-pam-ink">
                      {item.images!.length} photos
                    </span>
                  )}
                  {getEnabledSizes({ details: item.details }) && (
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-pam-ink">
                      {[
                        item.details?.sizes?.s != null ? "S" : null,
                        item.details?.sizes?.m != null ? "M" : null,
                        item.details?.sizes?.l != null ? "L" : null,
                      ]
                        .filter(Boolean)
                        .join(" / ")}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-[family-name:var(--font-oswald)] text-xl">
                      {item.name}
                    </h2>
                    <p className="text-xs capitalize text-pam-muted">
                      {item.category}
                    </p>
                  </div>
                  <p className="shrink-0 text-right font-[family-name:var(--font-oswald)] text-lg sm:text-xl">
                    {getEnabledSizes({ details: item.details }) ? (
                      <span className="block text-xs font-bold leading-snug text-pam-muted">
                        {[
                          item.details?.sizes?.s != null
                            ? `S ${formatPrice(item.details.sizes.s)}`
                            : null,
                          item.details?.sizes?.m != null
                            ? `M ${formatPrice(item.details.sizes.m)}`
                            : null,
                          item.details?.sizes?.l != null
                            ? `L ${formatPrice(item.details.sizes.l)}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    ) : (
                      formatPrice(item.price)
                    )}
                  </p>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-pam-muted">
                  {item.description}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="rounded-xl bg-pam-ink px-3 py-2.5 text-xs font-bold text-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleActive(item)}
                    className="rounded-xl bg-pam-sand px-3 py-2.5 text-xs font-bold text-pam-ink"
                  >
                    {item.active ? "Hide" : "Publish"}
                  </button>
                  <Link
                    href={`/product/${item.id}`}
                    target="_blank"
                    className="rounded-xl px-3 py-2.5 text-center text-xs font-bold text-pam-ink ring-1 ring-pam-border"
                  >
                    Open page
                  </Link>
                  <button
                    type="button"
                    onClick={() => askRemove(item)}
                    className="rounded-xl px-3 py-2.5 text-xs font-bold text-pam-red ring-1 ring-pam-red/25"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </AdminCard>
          ))}
          {!filtered.length && (
            <p className="col-span-full py-10 text-center text-sm text-pam-muted">
              No items match this filter.
            </p>
          )}
        </div>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            role="presentation"
            aria-hidden
            className="absolute inset-0 bg-black/45"
            onClick={closeEditor}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-editor-title"
            className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-wide text-pam-red uppercase">
                  {editingId ? "Update item" : "New item"}
                </p>
                <h3
                  id="menu-editor-title"
                  className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink"
                >
                  {editingId ? "Edit menu item" : "Add menu item"}
                </h3>
                <p className="text-xs text-pam-muted">
                  Prices are in Rwandan francs (RWF). Product details appear on
                  the item page.
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

            {error && <AdminAlert>{error}</AdminAlert>}
            {ok && <AdminAlert tone="ok">{ok}</AdminAlert>}

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
                    placeholder="auto-from-name"
                  />
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-semibold">Name</label>
                <input
                  className="input-field rounded-2xl"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Short description
                </label>
                <textarea
                  className="input-field min-h-20 rounded-2xl"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Category
                  </label>
                  <select
                    className="input-field rounded-2xl"
                    value={form.category}
                    onChange={(e) => {
                      const category = e.target.value;
                      setForm((f) => {
                        const pizza = PIZZA_CATEGORIES.has(category);
                        if (!pizza) {
                          return { ...f, category, sizesEnabled: false };
                        }
                        if (f.sizesEnabled) return { ...f, category };
                        const suggested = suggestedSizePrices(
                          Number(f.priceMedium || f.price) || 12000,
                        );
                        return {
                          ...f,
                          category,
                          sizesEnabled: true,
                          priceSmall: f.priceSmall || suggested.priceSmall,
                          priceMedium:
                            f.priceMedium || suggested.priceMedium || f.price,
                          priceLarge: f.priceLarge || suggested.priceLarge,
                        };
                      });
                    }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                {!form.sizesEnabled && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold">
                      Price (RWF)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      className="input-field rounded-2xl"
                      value={form.price}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, price: e.target.value }))
                      }
                      placeholder="1500"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-2xl border-2 border-pam-red/35 bg-pam-red/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold tracking-[0.14em] text-pam-red uppercase">
                      Size options
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-pam-ink">
                      Sell by Small / Medium / Large?
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-pam-muted">
                      Turn this ON so customers can pick a size on the product
                      page. The price shown changes with the size they select.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.sizesEnabled}
                    onClick={() =>
                      setForm((f) => {
                        if (f.sizesEnabled) {
                          return {
                            ...f,
                            sizesEnabled: false,
                            price: f.priceMedium || f.price || f.priceSmall,
                          };
                        }
                        const suggested = suggestedSizePrices(
                          Number(f.priceMedium || f.price) || 12000,
                        );
                        return {
                          ...f,
                          sizesEnabled: true,
                          priceSmall: f.priceSmall || suggested.priceSmall,
                          priceMedium:
                            f.priceMedium || suggested.priceMedium || f.price,
                          priceLarge: f.priceLarge || suggested.priceLarge,
                        };
                      })
                    }
                    className={`relative h-9 w-16 shrink-0 rounded-full transition ${
                      form.sizesEnabled ? "bg-pam-red" : "bg-pam-border"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition ${
                        form.sizesEnabled ? "left-8" : "left-1"
                      }`}
                    />
                    <span className="sr-only">
                      {form.sizesEnabled ? "Sizes on" : "Sizes off"}
                    </span>
                  </button>
                </div>

                {form.sizesEnabled ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      {(
                        [
                          ["priceSmall", "Small"],
                          ["priceMedium", "Medium"],
                          ["priceLarge", "Large"],
                        ] as const
                      ).map(([key, label]) => (
                        <div
                          key={key}
                          className="rounded-xl bg-white p-3 ring-1 ring-pam-border/80"
                        >
                          <label className="mb-1.5 block text-xs font-bold text-pam-ink">
                            {label}
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={100}
                            className="input-field rounded-xl"
                            value={form[key]}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, [key]: e.target.value }))
                            }
                            placeholder="RWF"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          ...suggestedSizePrices(
                            Number(f.priceMedium || f.price) || 12000,
                          ),
                        }))
                      }
                      className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-pam-ink ring-1 ring-pam-border"
                    >
                      Fill suggested prices from medium
                    </button>
                    <p className="text-[11px] leading-relaxed text-pam-muted">
                      Leave a size empty to hide it. After you save, open the
                      product page to see the size buttons.
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-pam-muted">
                    Sizes are OFF - customers will only see one price.
                  </p>
                )}
              </div>

              <MenuGalleryField
                images={form.images}
                onChange={(images) => {
                  setForm((f) => ({ ...f, images }));
                  setError("");
                }}
                onError={(message) => setError(message)}
              />

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Badge
                  </label>
                  <input
                    className="input-field rounded-2xl"
                    value={form.badge}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, badge: e.target.value }))
                    }
                    placeholder="DRINK / BESTSELLER"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Rating
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    className="input-field rounded-2xl"
                    value={form.rating}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, rating: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Reviews
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="input-field rounded-2xl"
                    value={form.reviews}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, reviews: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-pam-sand/50 p-3 sm:p-4">
                <p className="mb-3 text-sm font-bold text-pam-ink">
                  Product page details
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">
                      Ready in
                    </label>
                    <input
                      className="input-field rounded-2xl"
                      value={form.prepTime}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, prepTime: e.target.value }))
                      }
                      placeholder="Ready now"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">
                      Serves
                    </label>
                    <input
                      className="input-field rounded-2xl"
                      value={form.serves}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, serves: e.target.value }))
                      }
                      placeholder="1 person"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">
                      Energy
                    </label>
                    <input
                      className="input-field rounded-2xl"
                      value={form.calories}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, calories: e.target.value }))
                      }
                      placeholder="0–150 kcal"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="mb-1.5 block text-xs font-semibold">
                    Longer description
                  </label>
                  <textarea
                    className="input-field min-h-20 rounded-2xl"
                    value={form.longDescription}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        longDescription: e.target.value,
                      }))
                    }
                    placeholder="Shown under the title on the product page"
                  />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">
                      Ingredients (one per line)
                    </label>
                    <textarea
                      className="input-field min-h-24 rounded-2xl text-sm"
                      value={form.ingredients}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, ingredients: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">
                      Allergens (one per line)
                    </label>
                    <textarea
                      className="input-field min-h-24 rounded-2xl text-sm"
                      value={form.allergens}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, allergens: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">
                      Highlights (one per line)
                    </label>
                    <textarea
                      className="input-field min-h-24 rounded-2xl text-sm"
                      value={form.highlights}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, highlights: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-pam-sand px-4 py-3">
                <span className="text-sm font-semibold">Visible on website</span>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, active: e.target.checked }))
                  }
                  className="h-5 w-5 accent-pam-red"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="flex-1 rounded-2xl bg-pam-red px-5 py-3.5 text-sm font-bold text-white disabled:opacity-60 sm:flex-none"
              >
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Save changes"
                    : "Create item"}
              </button>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-2xl bg-pam-sand px-5 py-3.5 text-sm font-bold text-pam-ink"
              >
                Cancel
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    const item = items.find((i) => i.id === editingId);
                    if (item) askRemove(item);
                  }}
                  className="rounded-2xl px-5 py-3.5 text-sm font-bold text-pam-red ring-1 ring-pam-red/25"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this item?"
        description={
          pendingDelete ? (
            <>
              <p>
                You are about to permanently delete{" "}
                <span className="font-extrabold text-pam-ink">
                  “{pendingDelete.name}”
                </span>
                .
              </p>
              <p className="mt-2 rounded-xl bg-pam-red/10 px-3 py-2.5 text-pam-red">
                This cannot be undone. It will disappear from the menu and
                product page.
              </p>
            </>
          ) : null
        }
        confirmLabel="Delete permanently"
        cancelLabel="Keep item"
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={() => void confirmRemove()}
      />
    </AdminShell>
  );
}
