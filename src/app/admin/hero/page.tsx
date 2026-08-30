"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import HeroSlidesEditor from "@/components/admin/HeroSlidesEditor";
import {
  AdminAlert,
  AdminCard,
  AdminHelpTip,
  AdminPageHeader,
  AdminSkeleton,
} from "@/components/admin/AdminUI";
import { api, resolveMediaUrl } from "@/lib/api";
import {
  DEFAULT_SITE_SETTINGS,
  mergeSiteSettings,
  parseHeroSlides,
  serializeHeroSlides,
} from "@/lib/siteSettings";

export default function AdminHeroPage() {
  const [heroJson, setHeroJson] = useState(DEFAULT_SITE_SETTINGS.hero_slides);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const slides = useMemo(() => parseHeroSlides(heroJson), [heroJson]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ settings: Record<string, string> }>("/settings");
      const merged = mergeSiteSettings(data.settings);
      setHeroJson(merged.hero_slides);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hero.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      const next = parseHeroSlides(heroJson);
      if (!next.length) {
        throw new Error("Add at least one hero slide before saving.");
      }
      for (const slide of next) {
        if (!slide.title.trim() || !slide.image.trim()) {
          throw new Error("Each slide needs a title and an image.");
        }
      }
      const payload = serializeHeroSlides(next);
      await api("/settings", {
        method: "PUT",
        body: JSON.stringify({ hero_slides: payload }),
      });
      setHeroJson(payload);
      setSaved(true);
      window.dispatchEvent(new Event("palm-settings-updated"));
      window.setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Website look"
        title="Top banner"
        subtitle="These are the big photos and headlines at the top of your home page."
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

      <AdminHelpTip title="Easy steps" dismissKey="hero">
        Change the photo, title, and button text for each slide. When you are
        happy, press <strong>Save changes</strong>, then open{" "}
        <strong>Preview home</strong> to check.
      </AdminHelpTip>

      {error && <AdminAlert>{error}</AdminAlert>}
      {saved && (
        <AdminAlert tone="ok">
          Hero updated - refresh the homepage to see the new slides.
        </AdminAlert>
      )}

      {loading ? (
        <AdminSkeleton rows={4} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <AdminCard className="p-4 sm:p-5">
            <HeroSlidesEditor
              value={heroJson}
              onChange={setHeroJson}
              onError={setError}
              embedded
            />
            <div className="mt-5 flex flex-wrap gap-2 border-t border-pam-border pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-xl bg-pam-red px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : saved ? "Saved ✓" : "Save hero"}
              </button>
              <button
                type="button"
                disabled={loading || saving}
                onClick={() => void load()}
                className="rounded-xl bg-pam-sand px-4 py-2.5 text-sm font-bold text-pam-ink"
              >
                Reset changes
              </button>
            </div>
          </AdminCard>

          <div className="space-y-4">
            <AdminCard className="overflow-hidden p-0">
              <div className="border-b border-pam-border bg-pam-sand/50 px-4 py-3">
                <p className="text-[10px] font-bold tracking-[0.16em] text-pam-muted uppercase">
                  Live slide preview
                </p>
                <p className="mt-0.5 text-sm font-semibold text-pam-ink">
                  {slides.length} slide{slides.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="space-y-3 p-4">
                {slides.map((slide, i) => (
                  <div
                    key={`preview-${i}`}
                    className="overflow-hidden rounded-2xl border border-pam-border bg-pam-ink"
                  >
                    <div className="relative aspect-[16/9]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveMediaUrl(slide.image)}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                        <p className="text-[10px] font-bold tracking-wide text-pam-gold uppercase">
                          {slide.badge || `Slide ${i + 1}`}
                        </p>
                        <p className="mt-1 font-[family-name:var(--font-oswald)] text-lg leading-tight">
                          {slide.title || "Untitled"}
                          {slide.accent ? (
                            <span className="block text-pam-red">
                              {slide.accent}
                            </span>
                          ) : null}
                        </p>
                        {slide.sizePrices ? (
                          <p className="mt-2 text-[10px] text-white/80">
                            {[
                              slide.sizePrices.s != null
                                ? `S ${slide.sizePrices.s}`
                                : null,
                              slide.sizePrices.m != null
                                ? `M ${slide.sizePrices.m}`
                                : null,
                              slide.sizePrices.l != null
                                ? `L ${slide.sizePrices.l}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>

            <AdminCard className="bg-gradient-to-br from-pam-red to-[#9a1024] p-4 text-white sm:p-5">
              <p className="text-[10px] font-bold tracking-[0.16em] text-white/70 uppercase">
                Tips
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-white/90">
                <li>Use wide photos (about 1600×900) for best crop.</li>
                <li>Keep titles short - two lines max.</li>
                <li>CTA links can be `/pizzas`, `/burgers`, `/combos`, or `/offers`.</li>
                <li>Use templates for BOGO deals — upload a burger or pizza photo.</li>
              </ul>
              <Link
                href="/"
                target="_blank"
                className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-pam-ink"
              >
                Open homepage →
              </Link>
            </AdminCard>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
