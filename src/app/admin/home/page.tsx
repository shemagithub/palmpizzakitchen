"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import MenuImageField from "@/components/admin/MenuImageField";
import {
  AdminAlert,
  AdminCard,
  AdminHelpTip,
  AdminPageHeader,
  AdminSkeleton,
} from "@/components/admin/AdminUI";
import { api } from "@/lib/api";
import {
  DEFAULT_COMBO_BANNER,
  DEFAULT_ORDER_CTA,
  DEFAULT_TRUST_POINTS,
  parseComboBanner,
  parseOrderCta,
  parseTrustPoints,
  type ComboBannerContent,
  type OrderCtaContent,
  type TrustPointItem,
} from "@/lib/homeContent";
import { mergeSiteSettings } from "@/lib/siteSettings";

type Tab = "banner" | "trust" | "cta";

const TABS: { id: Tab; label: string }[] = [
  { id: "banner", label: "Promo banner" },
  { id: "trust", label: "Features" },
  { id: "cta", label: "Bottom banner" },
];

export default function AdminHomeContentPage() {
  const [tab, setTab] = useState<Tab>("banner");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [banner, setBanner] = useState<ComboBannerContent>(DEFAULT_COMBO_BANNER);
  const [trust, setTrust] = useState<TrustPointItem[]>(DEFAULT_TRUST_POINTS);
  const [cta, setCta] = useState<OrderCtaContent>(DEFAULT_ORDER_CTA);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ settings: Record<string, string> }>("/settings");
      const s = mergeSiteSettings(data.settings);
      setBanner(parseComboBanner(s.combo_banner));
      setTrust(parseTrustPoints(s.trust_points));
      setCta(parseOrderCta(s.order_cta));
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

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api("/settings", {
        method: "PUT",
        body: JSON.stringify({
          combo_banner: JSON.stringify(banner),
          trust_points: JSON.stringify(trust),
          order_cta: JSON.stringify(cta),
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

  const tip = useMemo(() => {
    switch (tab) {
      case "banner":
        return "The promo strip near Combos and Sides.";
      case "trust":
        return "The four short reasons to trust your shop.";
      case "cta":
        return "The big “order now” message at the bottom of the home page.";
    }
  }, [tab]);

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Website look"
        title="Home page text"
        subtitle="Edit promo banners and other home page messages. Customer reviews have their own page."
        actions={
          <>
            <Link
              href="/"
              target="_blank"
              className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
            >
              Preview home
            </Link>
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => void save()}
              className="rounded-xl bg-pam-red px-3.5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
            </button>
          </>
        }
      />

      <AdminHelpTip title="Pick a tab, then edit">
        Use the buttons below (Promo banner, Features, and so on). Change the
        words, then press <strong>Save changes</strong>. For customer reviews,
        open{" "}
        <Link href="/admin/reviews" className="font-bold text-pam-red">
          Reviews
        </Link>
        . To change the round home shortcuts (Pizzas, Drinks, Sides…), open{" "}
        <Link href="/admin/categories" className="font-bold text-pam-red">
          Home categories
        </Link>
        .
      </AdminHelpTip>

      {error && <AdminAlert>{error}</AdminAlert>}
      {saved && (
        <AdminAlert tone="ok">
          Home content saved - open Preview home to see it on the website.
        </AdminAlert>
      )}

      <div className="mb-4 no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition ${
              tab === t.id
                ? "bg-pam-red text-white"
                : "bg-white text-pam-muted ring-1 ring-pam-border"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mb-4 text-sm text-pam-muted">{tip}</p>

      {loading ? (
        <AdminSkeleton rows={4} />
      ) : (
        <AdminCard className="space-y-4 p-4 sm:p-5">
          {tab === "banner" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["eyebrow", "Eyebrow"],
                  ["title", "Title"],
                  ["copy", "Copy"],
                  ["cta", "CTA label"],
                  ["href", "CTA link"],
                  ["badge", "Circle badge text"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className={key === "copy" ? "sm:col-span-2" : ""}>
                  <label className="mb-1.5 block text-sm font-semibold">
                    {label}
                  </label>
                  <input
                    className="input-field rounded-2xl"
                    value={banner[key]}
                    onChange={(e) =>
                      setBanner((b) => ({ ...b, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <MenuImageField
                  label="Banner image"
                  value={banner.image}
                  onChange={(url) =>
                    setBanner((b) => ({
                      ...b,
                      image: url || DEFAULT_COMBO_BANNER.image,
                    }))
                  }
                  onError={setError}
                />
              </div>
            </div>
          )}

          {tab === "trust" && (
            <div className="space-y-3">
              {trust.map((item, i) => (
                <div
                  key={i}
                  className="grid gap-2 rounded-2xl border border-pam-border bg-pam-sand/40 p-3 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <input
                    className="input-field rounded-2xl"
                    value={item.label}
                    placeholder="Label"
                    onChange={(e) =>
                      setTrust((list) =>
                        list.map((row, idx) =>
                          idx === i ? { ...row, label: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  <input
                    className="input-field rounded-2xl"
                    value={item.sub}
                    placeholder="Subtitle"
                    onChange={(e) =>
                      setTrust((list) =>
                        list.map((row, idx) =>
                          idx === i ? { ...row, sub: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setTrust((list) => list.filter((_, idx) => idx !== i))
                    }
                    className="rounded-xl px-3 py-2 text-xs font-bold text-pam-red"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setTrust((list) => [
                    ...list,
                    { label: "New perk", sub: "Details" },
                  ])
                }
                className="rounded-xl bg-pam-ink px-4 py-2.5 text-sm font-bold text-white"
              >
                + Add feature
              </button>
            </div>
          )}

          {tab === "cta" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["title", "Title"],
                  ["copy", "Copy"],
                  ["primary_label", "Primary button"],
                  ["primary_href", "Primary link"],
                  ["secondary_label", "Secondary button"],
                  ["secondary_href", "Secondary link"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className={key === "copy" ? "sm:col-span-2" : ""}>
                  <label className="mb-1.5 block text-sm font-semibold">
                    {label}
                  </label>
                  <input
                    className="input-field rounded-2xl"
                    value={cta[key]}
                    onChange={(e) =>
                      setCta((c) => ({ ...c, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <MenuImageField
                  label="Background image"
                  value={cta.image}
                  onChange={(url) =>
                    setCta((c) => ({
                      ...c,
                      image: url || DEFAULT_ORDER_CTA.image,
                    }))
                  }
                  onError={setError}
                />
              </div>
            </div>
          )}

          <div className="border-t border-pam-border pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-xl bg-pam-red px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save content"}
            </button>
          </div>
        </AdminCard>
      )}
    </AdminShell>
  );
}
