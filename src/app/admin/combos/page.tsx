"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import MenuImageField from "@/components/admin/MenuImageField";
import {
  AdminAlert,
  AdminCard,
  AdminHelpTip,
  AdminPageHeader,
  AdminSkeleton,
} from "@/components/admin/AdminUI";
import {
  COMBO_SLOT_PRESETS,
  PIZZA_CATEGORY_SLUGS,
  formatPrice,
  normalizeComboSlots,
  type ComboSlot,
  type MenuItem,
} from "@/data/menu";
import { api, resolveMediaUrl } from "@/lib/api";

type Item = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  badge?: string;
  rating?: number;
  reviews?: number;
  active: boolean;
  details?: {
    comboSlots?: ComboSlot[];
  };
};

type CatalogItem = {
  id: string;
  name: string;
  category: MenuItem["category"];
  image: string;
  active?: boolean;
};

type FormState = {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  badge: string;
  rating: string;
  reviews: string;
  active: boolean;
  slots: ComboSlot[];
};

const EMPTY_FORM: FormState = {
  id: "",
  name: "",
  description: "",
  price: "",
  image: "",
  badge: "",
  rating: "4.8",
  reviews: "0",
  active: true,
  slots: [],
};

const SLOT_CATEGORY_OPTIONS: {
  id: MenuItem["category"];
  label: string;
}[] = [
  { id: "classic", label: "Classic pizza" },
  { id: "cheese", label: "Cheese pizza" },
  { id: "veggie", label: "Veggie pizza" },
  { id: "meat", label: "Meat pizza" },
  { id: "drink", label: "Drinks / soda" },
  { id: "side", label: "Sides" },
  { id: "burger", label: "Burgers" },
];

function newSlotId() {
  return `slot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function toForm(item?: Item | null): FormState {
  if (!item) return { ...EMPTY_FORM, slots: [] };
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: String(Math.round(item.price)),
    image: item.image,
    badge: item.badge || "",
    rating: String(item.rating ?? 4.8),
    reviews: String(item.reviews ?? 0),
    active: item.active,
    slots: normalizeComboSlots(item.details?.comboSlots) || [],
  };
}

export default function AdminCombosPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: Item[] }>("/menu/manage");
      const all = data.items || [];
      setItems(all.filter((item) => item.category === "combo"));
      setCatalog(
        all
          .filter((item) => item.category !== "combo")
          .map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category as MenuItem["category"],
            image: item.image,
            active: item.active,
          })),
      );
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load combos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q),
    );
  }, [items, query]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      slots: [
        {
          id: newSlotId(),
          label: "Choose your pizza",
          categories: [...PIZZA_CATEGORY_SLUGS],
        },
        {
          id: newSlotId(),
          label: "Choose your drink",
          categories: ["drink"],
        },
      ],
    });
    setEditorOpen(true);
    setOk("");
    setError("");
  };

  const openEdit = (item: Item) => {
    setEditingId(item.id);
    setForm(toForm(item));
    setEditorOpen(true);
    setOk("");
    setError("");
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const addPresetSlot = (presetId: string) => {
    const preset = COMBO_SLOT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setForm((f) => ({
      ...f,
      slots: [
        ...f.slots,
        {
          id: newSlotId(),
          label: preset.label,
          categories: [...preset.categories],
        },
      ],
    }));
  };

  const updateSlot = (slotId: string, patch: Partial<ComboSlot>) => {
    setForm((f) => ({
      ...f,
      slots: f.slots.map((s) => (s.id === slotId ? { ...s, ...patch } : s)),
    }));
  };

  const removeSlot = (slotId: string) => {
    setForm((f) => ({
      ...f,
      slots: f.slots.filter((s) => s.id !== slotId),
    }));
  };

  const toggleSlotCategory = (slotId: string, cat: MenuItem["category"]) => {
    setForm((f) => ({
      ...f,
      slots: f.slots.map((s) => {
        if (s.id !== slotId) return s;
        const has = s.categories.includes(cat);
        const categories = has
          ? s.categories.filter((c) => c !== cat)
          : [...s.categories, cat];
        return { ...s, categories };
      }),
    }));
  };

  const toggleSlotItem = (slotId: string, itemId: string) => {
    setForm((f) => ({
      ...f,
      slots: f.slots.map((s) => {
        if (s.id !== slotId) return s;
        const current = s.itemIds || [];
        const has = current.includes(itemId);
        const itemIds = has
          ? current.filter((id) => id !== itemId)
          : [...current, itemId];
        return { ...s, itemIds };
      }),
    }));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setOk("");
    try {
      for (const slot of form.slots) {
        if (!slot.label.trim()) {
          throw new Error("Each choice slot needs a clear label.");
        }
        if (!slot.categories.length) {
          throw new Error(
            `“${slot.label || "Slot"}” needs at least one product type (pizza, drink…).`,
          );
        }
      }

      const existingDetails =
        (editingId && items.find((i) => i.id === editingId)?.details) || {};
      const comboSlots = normalizeComboSlots(form.slots) || [];
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        image: form.image.trim(),
        category: "combo" as const,
        badge: form.badge.trim() || undefined,
        rating: Number(form.rating) || 4.8,
        reviews: Number(form.reviews) || 0,
        active: form.active ? 1 : 0,
        details: {
          ...existingDetails,
          comboSlots,
        },
      };

      if (!payload.name || !payload.description || !payload.image) {
        throw new Error("Name, description, and image are required.");
      }
      if (!Number.isFinite(payload.price) || payload.price < 0) {
        throw new Error("Enter a valid price in RWF.");
      }

      if (editingId) {
        await api(`/menu/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setOk("Combo updated.");
      } else {
        await api("/menu", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            id: form.id.trim() || undefined,
          }),
        });
        setOk("Combo created.");
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
      setOk(item.active ? "Combo hidden from storefront." : "Combo published.");
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
        title="Meal combos"
        subtitle="Create family deals where customers pick pizza type, soda, and more."
        actions={
          <>
            <Link
              href="/combos"
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
              onClick={openCreate}
              className="rounded-xl bg-pam-red px-3.5 py-2.5 text-sm font-bold text-white"
            >
              + Add combo
            </button>
          </>
        }
      />

      <AdminHelpTip title="How combo choices work">
        Add <strong>choice slots</strong> on each combo (e.g. pizza + drink). On
        the website, customers must select those products before adding the
        combo to cart. The kitchen sees the picks on the order line.
      </AdminHelpTip>

      {error && <AdminAlert>{error}</AdminAlert>}
      {ok && <AdminAlert tone="ok">{ok}</AdminAlert>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
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
          {filtered.map((item) => {
            const slots = normalizeComboSlots(item.details?.comboSlots) || [];
            return (
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
                    {slots.length > 0 && (
                      <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-pam-ink">
                        {slots.length} choice{slots.length === 1 ? "" : "s"}
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
                    </div>
                    <p className="shrink-0 font-[family-name:var(--font-oswald)] text-lg sm:text-xl">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-pam-muted">
                    {item.description}
                  </p>
                  {slots.length > 0 ? (
                    <p className="mt-2 text-[11px] font-semibold text-pam-ink/80">
                      Customer picks:{" "}
                      {slots.map((s) => s.label).join(" · ")}
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-pam-muted">
                      No selectable items yet — edit to add pizza / drink
                      choices.
                    </p>
                  )}
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
            );
          })}
          {!filtered.length && (
            <p className="col-span-full py-10 text-center text-sm text-pam-muted">
              {items.length
                ? "No combos match your search."
                : "No combos yet. Add your first combo meal."}
            </p>
          )}
        </div>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close editor"
            className="absolute inset-0"
            onClick={closeEditor}
          />
          <div className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-wide text-pam-red uppercase">
                  {editingId ? "Update combo" : "New combo"}
                </p>
                <h3 className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink">
                  {editingId ? "Edit combo meal" : "Add combo meal"}
                </h3>
                <p className="text-xs text-pam-muted">
                  Set price, then define what the customer chooses inside the
                  deal.
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
                  Description
                </label>
                <textarea
                  className="input-field min-h-24 rounded-2xl"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="e.g. 1 large pizza + 1.5L soda of your choice"
                />
              </div>
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
                  placeholder="18000"
                />
              </div>
              <div>
                <MenuImageField
                  value={form.image}
                  onChange={(image) => setForm((f) => ({ ...f, image }))}
                  onError={(message) => setError(message)}
                />
              </div>

              <div className="rounded-2xl border border-pam-border bg-pam-sand/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-pam-ink">
                      Customer choices inside this combo
                    </p>
                    <p className="mt-0.5 text-xs text-pam-muted">
                      Example: pizza type + soda. Each slot is one required
                      pick on the product page.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {COMBO_SLOT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => addPresetSlot(preset.id)}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-pam-ink ring-1 ring-pam-border"
                    >
                      + {preset.label.replace("Choose your ", "").replace("Choose a ", "")}
                    </button>
                  ))}
                </div>

                <div className="mt-4 space-y-3">
                  {form.slots.map((slot, index) => {
                    const pool = catalog.filter(
                      (m) =>
                        slot.categories.includes(m.category) &&
                        m.active !== false,
                    );
                    const narrowed = Boolean(slot.itemIds?.length);
                    return (
                      <div
                        key={slot.id}
                        className="rounded-2xl border border-pam-border bg-white p-3 sm:p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold tracking-wide text-pam-red uppercase">
                            Choice {index + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeSlot(slot.id)}
                            className="text-xs font-bold text-pam-red"
                          >
                            Remove
                          </button>
                        </div>
                        <label className="mt-2 mb-1.5 block text-sm font-semibold">
                          Label shown to customer
                        </label>
                        <input
                          className="input-field rounded-xl"
                          value={slot.label}
                          onChange={(e) =>
                            updateSlot(slot.id, { label: e.target.value })
                          }
                          placeholder="Choose your pizza"
                        />
                        <p className="mt-3 mb-1.5 text-sm font-semibold">
                          Product types allowed
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {SLOT_CATEGORY_OPTIONS.map((opt) => {
                            const on = slot.categories.includes(opt.id);
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() =>
                                  toggleSlotCategory(slot.id, opt.id)
                                }
                                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                  on
                                    ? "bg-pam-red text-white"
                                    : "bg-pam-sand text-pam-ink"
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">
                            Limit to specific products
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              updateSlot(slot.id, {
                                itemIds: narrowed ? undefined : [],
                              })
                            }
                            className="text-[11px] font-bold text-pam-ink underline"
                          >
                            {narrowed
                              ? "Allow all in types"
                              : "Pick specific items"}
                          </button>
                        </div>
                        {narrowed ? (
                          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl bg-pam-sand/50 p-2">
                            {!pool.length ? (
                              <p className="px-1 py-2 text-xs text-pam-muted">
                                No products in the selected types yet.
                              </p>
                            ) : (
                              pool.map((m) => {
                                const checked = (slot.itemIds || []).includes(
                                  m.id,
                                );
                                return (
                                  <label
                                    key={m.id}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() =>
                                        toggleSlotItem(slot.id, m.id)
                                      }
                                      className="accent-pam-red"
                                    />
                                    <span className="text-sm text-pam-ink">
                                      {m.name}
                                    </span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-pam-muted">
                            Customers can pick any live item in the selected
                            types ({pool.length} available).
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {!form.slots.length && (
                    <p className="rounded-xl bg-white/80 px-3 py-3 text-xs text-pam-muted">
                      No choices yet — this combo will add to cart as one fixed
                      package. Use the buttons above to let customers pick
                      pizza, soda, etc.
                    </p>
                  )}
                </div>
              </div>

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
                    placeholder="BESTSELLER"
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
                    : "Create combo"}
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
        title="Delete this combo?"
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
                This cannot be undone. Customers will no longer see this deal.
              </p>
            </>
          ) : null
        }
        confirmLabel="Delete permanently"
        cancelLabel="Keep combo"
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={() => void confirmRemove()}
      />
    </AdminShell>
  );
}
