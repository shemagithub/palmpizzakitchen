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
  StorefrontGrid,
} from "@/components/admin/AdminUI";
import { api } from "@/lib/api";
import {
  defaultDeliveryAreaFees,
  parseDeliveryAreaFees,
  serializeDeliveryAreaFees,
  type DeliveryAreaFee,
} from "@/lib/deliveryAreas";
import {
  DEFAULT_SITE_SETTINGS,
  mergeSiteSettings,
  type SiteSettings,
} from "@/lib/siteSettings";

export default function AdminSettingsPage() {
  const [form, setForm] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [areaFees, setAreaFees] = useState<DeliveryAreaFee[]>(
    defaultDeliveryAreaFees(Number(DEFAULT_SITE_SETTINGS.delivery_fee)),
  );
  const [newAreaName, setNewAreaName] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ settings: Record<string, string> }>("/settings");
      const merged = mergeSiteSettings(data.settings);
      setForm(merged);
      setAreaFees(
        parseDeliveryAreaFees(
          data.settings?.delivery_area_fees,
          Number(merged.delivery_fee) || 1500,
        ),
      );
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

  const addArea = () => {
    const name = newAreaName.trim();
    if (!name) {
      setError("Enter an area name.");
      return;
    }
    if (
      areaFees.some((row) => row.area.toLowerCase() === name.toLowerCase())
    ) {
      setError("That delivery area already exists.");
      return;
    }
    setAreaFees((rows) => [
      ...rows,
      { area: name, fee: Number(form.delivery_fee) || 1500 },
    ]);
    setNewAreaName("");
    setError("");
  };

  const removeArea = (area: string) => {
    if (areaFees.length <= 1) {
      setError("Keep at least one delivery area.");
      return;
    }
    setAreaFees((rows) => rows.filter((row) => row.area !== area));
    setError("");
  };

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      await api("/settings", {
        method: "PUT",
        body: JSON.stringify({
          company_name: form.company_name,
          company_tagline: form.company_tagline,
          logo_url: form.logo_url,
          footer_blurb: form.footer_blurb,
          about_text: form.about_text,
          phone: form.phone,
          email: form.email,
          address: form.address,
          open_hours: form.open_hours,
          social_instagram: form.social_instagram,
          social_facebook: form.social_facebook,
          social_tiktok: form.social_tiktok,
          social_twitter: form.social_twitter,
          social_whatsapp: form.social_whatsapp,
          promo_badge: form.promo_badge,
          accepting_orders: form.accepting_orders === "0" ? "0" : "1",
          delivery_fee: form.delivery_fee,
          delivery_area_fees: serializeDeliveryAreaFees(areaFees),
          min_order: form.min_order,
          kitchen_note: form.kitchen_note,
        }),
      });
      setSaved(true);
      window.dispatchEvent(new Event("palm-settings-updated"));
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Shop info"
        title="Shop settings"
        subtitle="Your business name, phone, address, delivery fee, opening hours, and social links."
        actions={
          <>
            <Link
              href="/"
              target="_blank"
              className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
            >
              Preview website
            </Link>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-xl bg-pam-red px-3.5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
            </button>
          </>
        }
      />

      <AdminHelpTip title="Remember to save">
        Scroll through the form and change what you need. Nothing goes live
        until you press the red <strong>Save changes</strong> button.
      </AdminHelpTip>

      {error && <AdminAlert>{error}</AdminAlert>}
      {saved && (
        <AdminAlert tone="ok">
          Saved - header, footer, contact, and about will update.
        </AdminAlert>
      )}

      {loading ? (
        <AdminSkeleton rows={5} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <AdminCard className="space-y-4 p-4 sm:p-5">
              <h2 className="font-[family-name:var(--font-oswald)] text-xl">
                Your shop name & logo
              </h2>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Company name
                </label>
                <input
                  className="input-field rounded-2xl"
                  value={form.company_name}
                  onChange={(e) => setField("company_name", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Tagline
                </label>
                <input
                  className="input-field rounded-2xl"
                  value={form.company_tagline}
                  onChange={(e) => setField("company_tagline", e.target.value)}
                />
              </div>
              <MenuImageField
                label="Company logo"
                value={form.logo_url}
                onChange={(url) => setField("logo_url", url || "/logo.png")}
                onError={setError}
              />
              <p className="text-xs text-pam-muted">
                Tip: upload a clear square logo photo. If you clear it, the
                default Palm Pizza logo is used.
              </p>
            </AdminCard>

            <AdminCard className="space-y-4 p-4 sm:p-5">
              <h2 className="font-[family-name:var(--font-oswald)] text-xl">
                Website text
              </h2>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Footer blurb
                </label>
                <textarea
                  className="input-field min-h-24 rounded-2xl"
                  value={form.footer_blurb}
                  onChange={(e) => setField("footer_blurb", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  About page story
                </label>
                <textarea
                  className="input-field min-h-28 rounded-2xl"
                  value={form.about_text}
                  onChange={(e) => setField("about_text", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Promo badge
                </label>
                <input
                  className="input-field rounded-2xl"
                  value={form.promo_badge}
                  onChange={(e) => setField("promo_badge", e.target.value)}
                  placeholder="Free delivery 25,000 RWF+"
                />
              </div>
            </AdminCard>

            <AdminCard className="space-y-4 p-4 sm:p-5">
              <h2 className="font-[family-name:var(--font-oswald)] text-xl">
                Contact details
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Phone
                  </label>
                  <input
                    className="input-field rounded-2xl"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Email
                  </label>
                  <input
                    className="input-field rounded-2xl"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Address
                </label>
                <input
                  className="input-field rounded-2xl"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Opening hours
                </label>
                <input
                  className="input-field rounded-2xl"
                  value={form.open_hours}
                  onChange={(e) => setField("open_hours", e.target.value)}
                />
              </div>
            </AdminCard>

            <AdminCard className="space-y-4 p-4 sm:p-5">
              <h2 className="font-[family-name:var(--font-oswald)] text-xl">
                Social media
              </h2>
              <p className="text-xs text-pam-muted">
                Leave blank to hide that icon on the website.
              </p>
              {(
                [
                  ["social_instagram", "Instagram page link"],
                  ["social_tiktok", "TikTok page link"],
                  ["social_twitter", "X / Twitter page link"],
                  ["social_whatsapp", "WhatsApp chat link"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="mb-1.5 block text-sm font-semibold">
                    {label}
                  </label>
                  <input
                    className="input-field rounded-2xl"
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    placeholder="https://"
                  />
                </div>
              ))}
            </AdminCard>

            <AdminCard className="p-4 sm:p-5">
              <h2 className="font-[family-name:var(--font-oswald)] text-xl">
                Store status
              </h2>
              <label className="mt-4 flex cursor-pointer items-center justify-between rounded-2xl bg-pam-sand px-4 py-3.5">
                <div>
                  <span className="text-sm font-semibold">Accepting orders</span>
                  <p className="text-xs text-pam-muted">
                    {form.accepting_orders !== "0"
                      ? "Customers can place orders"
                      : "Ordering is paused on the website"}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.accepting_orders !== "0"}
                  onChange={(e) =>
                    setField("accepting_orders", e.target.checked ? "1" : "0")
                  }
                  className="h-5 w-5 accent-pam-red"
                />
              </label>
            </AdminCard>

            <AdminCard className="space-y-4 p-4 sm:p-5">
              <h2 className="font-[family-name:var(--font-oswald)] text-xl">
                Delivery rules
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Default delivery fee (RWF)
                  </label>
                  <input
                    className="input-field rounded-2xl"
                    value={form.delivery_fee}
                    onChange={(e) => {
                      const next = e.target.value;
                      setField("delivery_fee", next);
                      const base = Number(next) || 0;
                      setAreaFees((rows) =>
                        rows.map((row) => ({
                          ...row,
                          fee: Number(row.fee) > 0 ? row.fee : base,
                        })),
                      );
                    }}
                  />
                  <p className="mt-1 text-[11px] text-pam-muted">
                    Used for areas without a custom price and as the cart
                    “from” amount.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Minimum order (RWF)
                  </label>
                  <input
                    className="input-field rounded-2xl"
                    value={form.min_order}
                    onChange={(e) => setField("min_order", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-pam-ink">
                      Delivery fee by area
                    </p>
                    <p className="text-xs text-pam-muted">
                      Add sectors and set a delivery fee for each. Customers
                      pick from this list at checkout.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAreaFees(
                        defaultDeliveryAreaFees(Number(form.delivery_fee) || 1500),
                      )
                    }
                    className="text-xs font-bold text-pam-red underline"
                  >
                    Reset to default list
                  </button>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <input
                    className="input-field min-w-0 flex-1 rounded-xl text-sm"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addArea();
                      }
                    }}
                    placeholder="New area name, e.g. Kabeza"
                  />
                  <button
                    type="button"
                    onClick={addArea}
                    className="rounded-xl bg-pam-ink px-4 py-2.5 text-sm font-bold text-white"
                  >
                    Add area
                  </button>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-pam-border bg-pam-sand/30 p-3">
                  {areaFees.map((row) => (
                    <div
                      key={row.area}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1 text-sm font-semibold text-pam-ink">
                        {row.area}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        aria-label={`Delivery fee for ${row.area}`}
                        className="input-field w-28 rounded-xl py-2 text-right text-sm"
                        value={row.fee}
                        onChange={(e) => {
                          const fee = Math.max(
                            0,
                            Math.round(Number(e.target.value) || 0),
                          );
                          setAreaFees((rows) =>
                            rows.map((item) =>
                              item.area === row.area ? { ...item, fee } : item,
                            ),
                          );
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeArea(row.area)}
                        className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-pam-muted hover:bg-pam-sand hover:text-pam-red"
                        aria-label={`Remove ${row.area}`}
                        title="Remove area"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Kitchen note
                </label>
                <textarea
                  className="input-field min-h-24 rounded-2xl"
                  value={form.kitchen_note}
                  onChange={(e) => setField("kitchen_note", e.target.value)}
                  placeholder="Internal note for the team…"
                />
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="w-full rounded-2xl bg-pam-red px-5 py-3.5 text-sm font-bold text-white disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Saving…" : saved ? "Saved ✓" : "Save all changes"}
              </button>
            </AdminCard>
          </div>

          <div className="space-y-4">
            <AdminCard className="overflow-hidden bg-gradient-to-br from-pam-red to-[#9a1024] p-4 text-white sm:p-5">
              <p className="text-[10px] font-bold tracking-[0.16em] text-white/75 uppercase">
                Live preview
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-oswald)] text-2xl">
                {form.company_name}
              </h3>
              <p className="mt-1 text-sm text-white/80">{form.company_tagline}</p>
              <p className="mt-3 text-xs text-white/70">
                {form.phone} · {form.email}
              </p>
              <p className="mt-1 text-xs text-white/70">{form.address}</p>
              <Link
                href="/"
                target="_blank"
                className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-pam-ink"
              >
                Open client website
              </Link>
            </AdminCard>

            <AdminCard className="h-fit p-4 sm:p-5">
              <h2 className="font-[family-name:var(--font-oswald)] text-xl">
                Check pages
              </h2>
              <p className="mt-1 text-sm text-pam-muted">
                After saving, review header, footer, contact, and about.
              </p>
              <div className="mt-4">
                <StorefrontGrid compact />
              </div>
            </AdminCard>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
