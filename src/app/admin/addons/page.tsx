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
  ALCOHOL_KINDS,
  alcoholKindLabel,
  formatPrice,
  normalizeAlcoholKind,
  type AlcoholKind,
  type ProductDetails,
} from "@/data/menu";
import { api, resolveMediaUrl } from "@/lib/api";

type SectionId = "fruit" | "alcohol" | "drink";

type Item = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  details?: Partial<ProductDetails>;
  active: boolean;
};

type FormState = {
  name: string;
  description: string;
  price: string;
  image: string;
  alcoholKind: AlcoholKind;
  active: boolean;
};

const SECTIONS: {
  id: SectionId;
  title: string;
  copy: string;
  page: string;
  pageLabel: string;
  addLabel: string;
  empty: string;
}[] = [
  {
    id: "fruit",
    title: "Fruit parts",
    copy: "Fruit cups, slices, and plates. Customers see these on Fruit parts and can add them at checkout.",
    page: "/fruit",
    pageLabel: "Open fruit page",
    addLabel: "Add fruit",
    empty: "No fruit parts yet. Add the fruit you actually sell.",
  },
  {
    id: "alcohol",
    title: "Wine & alcohol",
    copy: "Wine, champagne, beer, cocktails, and other alcohol. Customers filter these on Wine & bar and can add them at checkout. For guests 18 and over.",
    page: "/bar",
    pageLabel: "Open wine & bar",
    addLabel: "Add wine or alcohol",
    empty: "No wine or alcohol yet. Add each glass or bottle as its own item.",
  },
  {
    id: "drink",
    title: "Soft drinks",
    copy: "Sodas, juice, and water. These stay separate from wine. Customers see them on Drinks and can add them at checkout.",
    page: "/drinks",
    pageLabel: "Open drinks page",
    addLabel: "Add a drink",
    empty: "No soft drinks yet.",
  },
];

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  price: "",
  image: "",
  alcoholKind: "wine",
  active: true,
};

function toForm(item?: Item | null): FormState {
  if (!item) return { ...EMPTY_FORM };
  return {
    name: item.name,
    description: item.description,
    price: String(Math.round(Number(item.price) || 0)),
    image: item.image,
    alcoholKind: normalizeAlcoholKind(item.details?.alcoholKind) || "wine",
    active: item.active,
  };
}

export default function AdminAddonsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [section, setSection] = useState<SectionId | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [view, setView] = useState<SectionId>("fruit");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: Item[] }>("/menu/manage");
      setItems(data.items || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    return {
      fruit: items.filter((item) => item.category === "fruit"),
      alcohol: items.filter((item) => item.category === "alcohol"),
      drink: items.filter((item) => item.category === "drink"),
    };
  }, [items]);

  const openCreate = (next: SectionId) => {
    setView(next);
    setSection(next);
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      price: next === "fruit" ? "4500" : next === "alcohol" ? "8000" : "1500",
      alcoholKind: "wine",
    });
    setOk("");
    setError("");
    requestAnimationFrame(() => {
      document.getElementById("addon-editor")?.scrollIntoView({ block: "start" });
    });
  };

  const openEdit = (item: Item) => {
    const next = (item.category === "alcohol" || item.category === "drink"
      ? item.category
      : "fruit") as SectionId;
    setView(next);
    setSection(next);
    setEditingId(item.id);
    setForm(toForm(item));
    setOk("");
    setError("");
    requestAnimationFrame(() => {
      document.getElementById("addon-editor")?.scrollIntoView({ block: "start" });
    });
  };

  const closeEditor = () => {
    setSection(null);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const save = async () => {
    if (!section) return;
    setSaving(true);
    setError("");
    setOk("");
    try {
      const name = form.name.trim();
      const description = form.description.trim();
      const image = form.image.trim();
      const price = Number(form.price);
      if (!name || !description || !image) {
        throw new Error("Name, description, and a photo are required.");
      }
      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Enter a valid price in RWF.");
      }
      const payload = {
        name,
        description,
        price,
        image,
        images: [image],
        category: section,
        active: form.active ? 1 : 0,
        rating: 4.8,
        reviews: 0,
        details: {
          ...(section === "alcohol" ? { alcoholKind: form.alcoholKind } : {}),
          sizes: { enabled: false },
        },
      };
      if (editingId) {
        await api(`/menu/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setOk("Saved.");
      } else {
        await api("/menu", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setOk("Added. It is live on the shop and at checkout.");
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
    const nextActive = !item.active;
    setError("");
    setItems((list) =>
      list.map((row) =>
        row.id === item.id ? { ...row, active: nextActive } : row,
      ),
    );
    try {
      await api(`/menu/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: nextActive ? 1 : 0 }),
      });
      setOk(nextActive ? "Published." : "Hidden from the shop and checkout.");
      window.dispatchEvent(new Event("palm-menu-updated"));
    } catch (err) {
      setItems((list) =>
        list.map((row) =>
          row.id === item.id ? { ...row, active: item.active } : row,
        ),
      );
      setError(err instanceof Error ? err.message : "Update failed.");
    }
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

  const activeSection = SECTIONS.find((row) => row.id === section);

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Checkout extras"
        title="Fruit, wine & drinks"
        subtitle="This is the place to control fruit parts, wine, champagne, other alcohol, and soft drinks. What you publish here is what customers can add before they pay."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
          >
            Refresh list
          </button>
        }
      />

      <AdminHelpTip title="What this page controls" dismissKey="admin-addons">
        Publish an item and it appears on its page and in the checkout
        question. <strong>Hide</strong> takes it off the shop without deleting
        it. For wine, pick the type — Wine, Champagne, Beer, Cocktail, Spirits,
        or Other — so customers can filter Wine &amp; bar. A glass and a bottle
        with different prices are two items.
      </AdminHelpTip>

      {error && <AdminAlert>{error}</AdminAlert>}
      {ok && <AdminAlert tone="ok">{ok}</AdminAlert>}

      <div className="sticky top-[4.25rem] z-20 -mx-3 mb-4 border-b border-pam-border/70 bg-[#f3ebe3]/95 px-3 py-2 backdrop-blur sm:-mx-5 sm:px-5 lg:top-14">
        <div className="grid grid-cols-3 gap-1.5">
          {SECTIONS.map((block) => {
            const rows = grouped[block.id];
            const live = rows.filter((item) => item.active).length;
            const selected = view === block.id;
            const short =
              block.id === "fruit" ? "Fruit" : block.id === "alcohol" ? "Wine" : "Drinks";
            return (
              <button
                key={block.id}
                type="button"
                onClick={() => {
                  setView(block.id);
                  if (section && section !== block.id) closeEditor();
                }}
                className={`min-h-11 rounded-xl px-1.5 py-2 text-center ${
                  selected
                    ? "bg-pam-ink text-white"
                    : "bg-white text-pam-ink ring-1 ring-pam-border"
                }`}
              >
                <span className="block text-xs font-bold sm:text-sm">{short}</span>
                <span
                  className={`block text-[10px] font-semibold ${
                    selected ? "text-white/70" : "text-pam-muted"
                  }`}
                >
                  {live} live
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {section && activeSection && (
        <div id="addon-editor" className="scroll-mt-36">
        <AdminCard className="mb-5 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-[0.14em] text-pam-red uppercase">
                {editingId ? "Edit" : "New"} · {activeSection.title}
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-oswald)] text-2xl text-pam-ink">
                {editingId ? form.name || "Edit item" : activeSection.addLabel}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeEditor}
              className="rounded-xl bg-pam-sand px-3 py-2 text-sm font-bold"
            >
              Close
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Name</label>
              <input
                className="input-field rounded-2xl"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={
                  section === "fruit"
                    ? "Fresh fruit cup"
                    : section === "alcohol"
                      ? "House red — glass"
                      : "Coca-Cola"
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
                />
              </div>
              {section === "alcohol" && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Type
                  </label>
                  <select
                    className="input-field rounded-2xl"
                    value={form.alcoholKind}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        alcoholKind: e.target.value as AlcoholKind,
                      }))
                    }
                  >
                    {ALCOHOL_KINDS.map((kind) => (
                      <option key={kind.id} value={kind.id}>
                        {kind.label} — {kind.hint}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <MenuImageField
              value={form.image}
              label="Photo"
              onChange={(image) => setForm((f) => ({ ...f, image }))}
              onError={(message) => setError(message)}
            />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />
              Show on the shop and at checkout
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="min-h-11 w-full rounded-2xl bg-pam-red px-4 py-3 text-sm font-bold text-white disabled:opacity-60 sm:w-auto"
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Add to menu"}
            </button>
          </div>
        </AdminCard>
        </div>
      )}

      {loading ? (
        <AdminSkeleton rows={3} />
      ) : (
        <div className="space-y-4">
          {SECTIONS.filter((block) => block.id === view).map((block) => {
            const rows = grouped[block.id];
            const live = rows.filter((item) => item.active).length;
            return (
              <section key={block.id}>
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink">
                      {block.title}
                    </h2>
                    <p className="mt-1 text-sm text-pam-muted">{block.copy}</p>
                    <p className="mt-1 text-xs font-bold text-pam-ink">
                      {live} live · {rows.length - live} hidden
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Link
                      href={block.page}
                      target="_blank"
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-3 text-center text-sm font-bold text-pam-ink ring-1 ring-pam-border"
                    >
                      {block.pageLabel}
                    </Link>
                    <button
                      type="button"
                      onClick={() => openCreate(block.id)}
                      className="min-h-11 rounded-xl bg-pam-red px-3 text-sm font-bold text-white"
                    >
                      + {block.addLabel}
                    </button>
                  </div>
                </div>

                {rows.length ? (
                  <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
                    {rows.map((item) => (
                      <AdminCard
                        key={item.id}
                        className={`overflow-hidden ${item.active ? "" : "opacity-75"}`}
                      >
                        <div className="flex gap-3 p-3 sm:block sm:p-0">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-pam-sand sm:h-auto sm:w-full sm:rounded-none sm:aspect-[16/9]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveMediaUrl(item.image)}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                            <span
                              className={`absolute top-2 left-2 hidden rounded-full px-2.5 py-1 text-[10px] font-bold text-white sm:inline ${
                                item.active ? "bg-pam-basil" : "bg-pam-ink/80"
                              }`}
                            >
                              {item.active ? "Live" : "Hidden"}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 sm:p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="truncate font-[family-name:var(--font-oswald)] text-lg sm:text-xl">
                                  {item.name}
                                </h3>
                                <p className="truncate text-xs text-pam-muted">
                                  {item.active ? "Live" : "Hidden"}
                                  {" · "}
                                  {item.category === "alcohol"
                                    ? alcoholKindLabel(item.details?.alcoholKind)
                                    : block.title}
                                </p>
                              </div>
                              <p className="shrink-0 font-[family-name:var(--font-oswald)] text-base sm:text-lg">
                                {formatPrice(item.price)}
                              </p>
                            </div>
                            <p className="mt-1 line-clamp-2 hidden text-sm text-pam-muted sm:block">
                              {item.description}
                            </p>
                            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(item)}
                                className="min-h-11 rounded-xl bg-pam-ink px-1 text-xs font-bold text-white"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void toggleActive(item)}
                                className="min-h-11 rounded-xl bg-pam-sand px-1 text-xs font-bold text-pam-ink"
                              >
                                {item.active ? "Hide" : "Publish"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDelete(item)}
                                className="min-h-11 rounded-xl px-1 text-xs font-bold text-pam-red ring-1 ring-pam-red/25"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </AdminCard>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl bg-white px-4 py-6 text-sm text-pam-muted ring-1 ring-pam-border">
                    {block.empty}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this item?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” will be removed from the shop and from checkout.`
            : ""
        }
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={() => void confirmRemove()}
      />
    </AdminShell>
  );
}
