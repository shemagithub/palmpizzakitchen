"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import MenuImageField from "@/components/admin/MenuImageField";
import {
  AdminAlert,
  AdminCard,
  AdminHelpTip,
  AdminPageHeader,
  AdminSkeleton,
} from "@/components/admin/AdminUI";
import { api, resolveMediaUrl } from "@/lib/api";
import {
  DEFAULT_QUICK_CATEGORIES,
  newQuickCategoryId,
  parseQuickCategories,
  serializeQuickCategories,
  type QuickCategoryItem,
} from "@/lib/homeContent";
import { mergeSiteSettings } from "@/lib/siteSettings";

const DESTINATIONS = [
  { href: "/pizzas", label: "Pizzas" },
  { href: "/burgers", label: "Burgers" },
  { href: "/sides", label: "Sides" },
  { href: "/drinks", label: "Drinks" },
  { href: "/combos", label: "Combos" },
  { href: "/offers", label: "Offers" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/", label: "Home page" },
] as const;

type FormState = {
  id: string;
  label: string;
  href: string;
  image: string;
};

const EMPTY_FORM: FormState = {
  id: "",
  label: "",
  href: "/pizzas",
  image: "",
};

function toForm(item?: QuickCategoryItem | null): FormState {
  if (!item) return { ...EMPTY_FORM, id: newQuickCategoryId() };
  return {
    id: item.id,
    label: item.label,
    href: item.href,
    image: item.image,
  };
}

function knownDestination(href: string) {
  return DESTINATIONS.some((d) => d.href === href);
}

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<QuickCategoryItem[]>(
    DEFAULT_QUICK_CATEGORIES,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const persist = useCallback(async (next: QuickCategoryItem[]) => {
    setSaving(true);
    setError("");
    try {
      await api("/settings", {
        method: "PUT",
        body: JSON.stringify({
          quick_categories: serializeQuickCategories(next),
        }),
      });
      setItems(next);
      window.dispatchEvent(new Event("palm-settings-updated"));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ settings: Record<string, string> }>("/settings");
      const s = mergeSiteSettings(data.settings);
      setItems(parseQuickCategories(s.quick_categories));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(toForm(null));
    setEditorOpen(true);
    setOk("");
    setError("");
  };

  const openEdit = (item: QuickCategoryItem) => {
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

  const saveEditor = async () => {
    const label = form.label.trim();
    const image = form.image.trim();
    const href = form.href.trim() || "/pizzas";
    if (!label || !image) {
      setError("Each category needs a name and a photo.");
      return;
    }
    const nextItem: QuickCategoryItem = {
      id: form.id || newQuickCategoryId(),
      label,
      href,
      image,
    };
    const next = editingId
      ? items.map((row) => (row.id === editingId ? nextItem : row))
      : [...items, nextItem];
    const saved = await persist(next);
    if (saved) {
      setOk(editingId ? "Category updated." : "Category added.");
      closeEditor();
    }
  };

  const remove = async (item: QuickCategoryItem) => {
    const confirmed = window.confirm(
      `Delete “${item.label}” from the home shortcuts?`,
    );
    if (!confirmed) return;
    const saved = await persist(items.filter((row) => row.id !== item.id));
    if (saved) {
      setOk(`“${item.label}” removed.`);
      if (editingId === item.id) closeEditor();
    }
  };

  const removeAll = async () => {
    if (!items.length) return;
    const confirmed = window.confirm(
      "Delete every shortcut? The round category row will disappear from the home page until you add new ones.",
    );
    if (!confirmed) return;
    const saved = await persist([]);
    if (saved) {
      setOk("All shortcuts removed.");
      closeEditor();
    }
  };

  const restoreDefaults = async () => {
    const confirmed = window.confirm(
      "Replace the current list with the original shortcuts (All, Pizzas, Garlic Bread, Sides, Drinks, Desserts)?",
    );
    if (!confirmed) return;
    const saved = await persist(DEFAULT_QUICK_CATEGORIES.map((t) => ({ ...t })));
    if (saved) setOk("Default shortcuts restored.");
  };

  const move = async (index: number, dir: -1 | 1) => {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const copy = [...items];
    const [row] = copy.splice(index, 1);
    copy.splice(nextIndex, 0, row);
    const saved = await persist(copy);
    if (saved) setOk("Order updated.");
  };

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Website look"
        title="Home categories"
        subtitle="These round shortcuts appear under the top banner. Change names, photos, links - add new ones or delete any of them."
        actions={
          <>
            <Link
              href="/"
              target="_blank"
              className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
            >
              See on home
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-pam-red px-3.5 py-2.5 text-sm font-bold text-white"
            >
              + Add category
            </button>
          </>
        }
      />

      <AdminHelpTip title="How to use this page" dismissKey="categories">
        Tap a circle to edit it. Upload a new photo, change the name, or pick
        where it goes (Pizzas, Drinks, Sides…). Use arrows to reorder. Changes
        save immediately.
      </AdminHelpTip>

      {error && <AdminAlert>{error}</AdminAlert>}
      {ok && <AdminAlert tone="ok">{ok}</AdminAlert>}

      {loading ? (
        <AdminSkeleton rows={3} />
      ) : (
        <>
          <AdminCard className="mb-5 overflow-x-auto p-4 sm:p-5">
            <p className="mb-3 text-xs font-bold tracking-wide text-pam-muted uppercase">
              Live preview
            </p>
            {items.length ? (
              <div className="flex min-w-max items-end gap-5">
                {items.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openEdit(item)}
                    className="flex w-[88px] flex-col items-center gap-2"
                  >
                    <span
                      className={`relative h-[72px] w-[72px] overflow-hidden rounded-full bg-white p-1 ${
                        i === 0
                          ? "ring-2 ring-pam-red"
                          : "ring-1 ring-pam-border"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveMediaUrl(item.image)}
                        alt={item.label}
                        className="h-full w-full rounded-full object-cover"
                      />
                    </span>
                    <span
                      className={`text-center text-[11px] font-semibold leading-tight ${
                        i === 0 ? "text-pam-red" : "text-pam-ink"
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-pam-muted">
                No shortcuts yet. Press <strong>+ Add category</strong> to
                create the first one.
              </p>
            )}
          </AdminCard>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || !items.length}
              onClick={() => void removeAll()}
              className="rounded-xl px-3.5 py-2.5 text-sm font-bold text-pam-red ring-1 ring-pam-red/25 disabled:opacity-50"
            >
              Delete all
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void restoreDefaults()}
              className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-pam-ink ring-1 ring-pam-border disabled:opacity-50"
            >
              Restore defaults
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item, index) => (
              <AdminCard key={item.id} className="overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveMediaUrl(item.image)}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-pam-border"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-[family-name:var(--font-oswald)] text-xl">
                      {item.label}
                    </h2>
                    <p className="truncate text-xs text-pam-muted">{item.href}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 border-t border-pam-border/70 p-3">
                  <button
                    type="button"
                    disabled={saving || index === 0}
                    onClick={() => void move(index, -1)}
                    className="rounded-xl bg-pam-sand py-2 text-xs font-bold disabled:opacity-40"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    disabled={saving || index === items.length - 1}
                    onClick={() => void move(index, 1)}
                    className="rounded-xl bg-pam-sand py-2 text-xs font-bold disabled:opacity-40"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="rounded-xl bg-pam-ink py-2 text-xs font-bold text-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void remove(item)}
                    className="rounded-xl py-2 text-xs font-bold text-pam-red ring-1 ring-pam-red/25 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </AdminCard>
            ))}
          </div>
        </>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close editor"
            className="absolute inset-0"
            onClick={closeEditor}
          />
          <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold tracking-wide text-pam-red uppercase">
                  {editingId ? "Update shortcut" : "New shortcut"}
                </p>
                <h3 className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink">
                  {editingId ? "Edit category" : "Add category"}
                </h3>
                <p className="text-xs text-pam-muted">
                  Name, photo, and the page it opens when tapped.
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
              <div>
                <label className="mb-1.5 block text-sm font-semibold">Name</label>
                <input
                  className="input-field rounded-2xl"
                  value={form.label}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, label: e.target.value }))
                  }
                  placeholder="Drinks"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Opens this page
                </label>
                <select
                  className="input-field rounded-2xl"
                  value={knownDestination(form.href) ? form.href : "__custom"}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((f) => ({
                      ...f,
                      href: value === "__custom" ? f.href || "/" : value,
                    }));
                  }}
                >
                  {DESTINATIONS.map((d) => (
                    <option key={d.href} value={d.href}>
                      {d.label} ({d.href})
                    </option>
                  ))}
                  <option value="__custom">Custom link…</option>
                </select>
              </div>
              {!knownDestination(form.href) && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Custom link
                  </label>
                  <input
                    className="input-field rounded-2xl"
                    value={form.href}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, href: e.target.value }))
                    }
                    placeholder="/sides"
                  />
                </div>
              )}
              <MenuImageField
                label="Category photo"
                value={form.image}
                onChange={(image) => setForm((f) => ({ ...f, image }))}
                onError={setError}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveEditor()}
                className="flex-1 rounded-2xl bg-pam-red px-5 py-3.5 text-sm font-bold text-white disabled:opacity-60 sm:flex-none"
              >
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Save changes"
                    : "Add category"}
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
                    if (item) void remove(item);
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
    </AdminShell>
  );
}
