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
import { api } from "@/lib/api";
import {
  DEFAULT_TRUST_POINTS,
  parseTrustPoints,
  type TrustPointItem,
} from "@/lib/homeContent";
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings } from "@/lib/siteSettings";

export default function AdminAboutPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [subtitle, setSubtitle] = useState(DEFAULT_SITE_SETTINGS.about_subtitle);
  const [trust, setTrust] = useState<TrustPointItem[]>(DEFAULT_TRUST_POINTS);
  const [storyTitle, setStoryTitle] = useState(
    DEFAULT_SITE_SETTINGS.about_story_title,
  );
  const [storyImage, setStoryImage] = useState(
    DEFAULT_SITE_SETTINGS.about_story_image,
  );
  const [aboutText, setAboutText] = useState(DEFAULT_SITE_SETTINGS.about_text);
  const [openHours, setOpenHours] = useState(DEFAULT_SITE_SETTINGS.open_hours);
  const [promo, setPromo] = useState(DEFAULT_SITE_SETTINGS.promo_badge);
  const [address, setAddress] = useState(DEFAULT_SITE_SETTINGS.address);
  const [phone, setPhone] = useState(DEFAULT_SITE_SETTINGS.phone);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ settings: Record<string, string> }>("/settings");
      const s = mergeSiteSettings(data.settings);
      setSubtitle(s.about_subtitle);
      setTrust(parseTrustPoints(s.trust_points).slice(0, 4));
      setStoryTitle(s.about_story_title);
      setStoryImage(s.about_story_image);
      setAboutText(s.about_text);
      setOpenHours(s.open_hours);
      setPromo(s.promo_badge);
      setAddress(s.address);
      setPhone(s.phone);
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
      const points = [...trust];
      while (points.length < 4) points.push({ label: "", sub: "" });
      await api("/settings", {
        method: "PUT",
        body: JSON.stringify({
          about_subtitle: subtitle,
          about_story_title: storyTitle,
          about_story_image: storyImage,
          about_text: aboutText,
          trust_points: JSON.stringify(points.slice(0, 4)),
          open_hours: openHours,
          promo_badge: promo,
          address,
          phone,
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
        eyebrow="Website"
        title="About page"
        subtitle="Edit the About page: top line, four features, kitchen story, photo, hours, and address."
        actions={
          <>
            <Link
              href="/about"
              target="_blank"
              className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
            >
              Preview About
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
      <AdminHelpTip>
        Changes appear on /about after Save. Hours, promo, address, and phone
        also show on other pages that use shop info.
      </AdminHelpTip>

      {error && <AdminAlert>{error}</AdminAlert>}
      {saved && (
        <AdminAlert tone="ok">About page saved - open Preview About.</AdminAlert>
      )}

      {loading ? (
        <AdminSkeleton rows={6} />
      ) : (
        <div className="space-y-4">
          <AdminCard className="space-y-3 p-4 sm:p-5">
            <h2 className="font-[family-name:var(--font-oswald)] text-xl">
              Top banner
            </h2>
            <label className="block text-sm font-semibold">Tagline</label>
            <textarea
              className="input-field min-h-20 rounded-2xl"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </AdminCard>

          <AdminCard className="space-y-4 p-4 sm:p-5">
            <h2 className="font-[family-name:var(--font-oswald)] text-xl">
              Four features
            </h2>
            <p className="text-xs text-pam-muted">
              Same row as on the home page (Fast Delivery, Best Quality, …).
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {(trust.length ? trust : DEFAULT_TRUST_POINTS).slice(0, 4).map(
                (item, i) => (
                  <div key={i} className="space-y-2 rounded-2xl bg-pam-sand/60 p-3">
                    <p className="text-[11px] font-bold text-pam-muted">
                      Feature {i + 1}
                    </p>
                    <input
                      className="input-field rounded-2xl"
                      value={item.label}
                      onChange={(e) =>
                        setTrust((list) => {
                          const next = [...list];
                          while (next.length < 4) next.push({ label: "", sub: "" });
                          next[i] = { ...next[i], label: e.target.value };
                          return next;
                        })
                      }
                      placeholder="Title"
                    />
                    <input
                      className="input-field rounded-2xl"
                      value={item.sub}
                      onChange={(e) =>
                        setTrust((list) => {
                          const next = [...list];
                          while (next.length < 4) next.push({ label: "", sub: "" });
                          next[i] = { ...next[i], sub: e.target.value };
                          return next;
                        })
                      }
                      placeholder="Short line"
                    />
                  </div>
                ),
              )}
            </div>
          </AdminCard>

          <AdminCard className="space-y-4 p-4 sm:p-5">
            <h2 className="font-[family-name:var(--font-oswald)] text-xl">
              Kitchen story
            </h2>
            <label className="block text-sm font-semibold">Heading</label>
            <input
              className="input-field rounded-2xl"
              value={storyTitle}
              onChange={(e) => setStoryTitle(e.target.value)}
            />
            <MenuImageField
              label="Story photo"
              value={storyImage}
              onChange={setStoryImage}
              onError={setError}
            />
            <label className="block text-sm font-semibold">Story text</label>
            <textarea
              className="input-field min-h-32 rounded-2xl"
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
            />
          </AdminCard>

          <AdminCard className="space-y-3 p-4 sm:p-5">
            <h2 className="font-[family-name:var(--font-oswald)] text-xl">
              Hours and contact
            </h2>
            <label className="block text-sm font-semibold">Open hours</label>
            <input
              className="input-field rounded-2xl"
              value={openHours}
              onChange={(e) => setOpenHours(e.target.value)}
            />
            <label className="block text-sm font-semibold">
              Delivery / promo line
            </label>
            <input
              className="input-field rounded-2xl"
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
            />
            <label className="block text-sm font-semibold">Address</label>
            <input
              className="input-field rounded-2xl"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <label className="block text-sm font-semibold">Phone</label>
            <input
              className="input-field rounded-2xl"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </AdminCard>
        </div>
      )}
    </AdminShell>
  );
}
