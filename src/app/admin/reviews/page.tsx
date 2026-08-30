"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import ReviewCard, { StarRow, averageRating } from "@/components/ReviewCard";
import {
  AdminAlert,
  AdminCard,
  AdminHelpTip,
  AdminPageHeader,
  AdminSkeleton,
} from "@/components/admin/AdminUI";
import { api } from "@/lib/api";
import { KIGALI_DELIVERY_AREAS } from "@/lib/deliveryAreas";
import {
  DEFAULT_TESTIMONIALS,
  newTestimonial,
  parseTestimonials,
  serializeTestimonials,
  validateTestimonials,
  type TestimonialItem,
} from "@/lib/homeContent";
import { mergeSiteSettings } from "@/lib/siteSettings";

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-xl border border-pam-border bg-pam-sand/60 px-3 py-2"
      role="group"
      aria-label="Star rating"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`rounded-md px-1 py-0.5 text-xl leading-none transition hover:scale-110 ${
            star <= value ? "text-pam-gold" : "text-pam-border hover:text-pam-gold/70"
          }`}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          aria-pressed={star <= value}
        >
          ★
        </button>
      ))}
      <span className="ml-2 text-xs font-bold text-pam-muted">{value}/5</span>
    </div>
  );
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next;
}

export default function AdminReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState<TestimonialItem[]>([]);
  const [selected, setSelected] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ settings: Record<string, string> }>("/settings");
      const s = mergeSiteSettings(data.settings);
      const parsed = parseTestimonials(s.testimonials);
      setReviews(parsed.length ? parsed : []);
      setSelected(0);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const validation = useMemo(() => validateTestimonials(reviews), [reviews]);
  const validationMap = useMemo(
    () => new Map(validation.map((row) => [row.index, row.issues])),
    [validation],
  );

  const previewReview = reviews[selected] ?? reviews[0];
  const avg = averageRating(reviews);

  const save = async () => {
    const issues = validateTestimonials(reviews);
    if (issues.length) {
      setError(
        `Fix ${issues.length} review${issues.length === 1 ? "" : "s"} before saving — each needs a name and review text.`,
      );
      setSelected(issues[0].index);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api("/settings", {
        method: "PUT",
        body: JSON.stringify({
          testimonials: serializeTestimonials(reviews),
        }),
      });
      setSaved(true);
      window.dispatchEvent(new Event("palm-settings-updated"));
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const updateReview = (index: number, patch: Partial<TestimonialItem>) => {
    setReviews((list) =>
      list.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Website look"
        title="Customer reviews"
        subtitle="Quotes in the “What customers say” section on the home page."
        actions={
          <>
            <Link
              href="/"
              target="_blank"
              className="rounded-xl border border-pam-border bg-white px-3.5 py-2.5 text-sm font-bold text-pam-ink transition hover:border-pam-red/30 hover:text-pam-red"
            >
              Preview home
            </Link>
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => void save()}
              className="rounded-xl bg-pam-red px-3.5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-pam-red-deep disabled:opacity-60"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save reviews"}
            </button>
          </>
        }
      />

      <AdminHelpTip title="How this works" dismissKey="admin-reviews">
        Add real feedback from customers — first name or initials is fine. Use
        the arrows to change order (first review shows first on the site). Remove
        every review and save to hide the section on the home page.
      </AdminHelpTip>

      {error && <AdminAlert>{error}</AdminAlert>}
      {saved && (
        <AdminAlert tone="ok">
          Reviews saved. Open Preview home to check the carousel on the website.
        </AdminAlert>
      )}

      {loading ? (
        <AdminSkeleton rows={5} />
      ) : (
        <>
          {reviews.length > 0 && (
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "Reviews live", value: String(reviews.length) },
                { label: "Average rating", value: avg ? `${avg} ★` : "—" },
                {
                  label: "Home section",
                  value: reviews.length ? "Visible" : "Hidden",
                },
              ].map((stat) => (
                <AdminCard
                  key={stat.label}
                  className="px-4 py-3.5 text-center sm:text-left"
                >
                  <p className="text-[11px] font-bold text-pam-muted uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-oswald)] text-2xl text-pam-ink">
                    {stat.value}
                  </p>
                </AdminCard>
              ))}
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
            <AdminCard className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pam-border bg-pam-sand/40 px-4 py-4 sm:px-5">
                <div>
                  <p className="font-[family-name:var(--font-oswald)] text-lg text-pam-ink">
                    Your reviews
                  </p>
                  <p className="text-xs text-pam-muted">
                    Tap a row to edit. Order matches the home page carousel.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReviews(DEFAULT_TESTIMONIALS.map((t) => ({ ...t })));
                      setSelected(0);
                    }}
                    className="rounded-lg border border-pam-border bg-white px-3 py-2 text-xs font-bold text-pam-ink transition hover:border-pam-ink/30"
                  >
                    Restore samples
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReviews((list) => [...list, newTestimonial()]);
                      setSelected(reviews.length);
                    }}
                    className="rounded-lg bg-pam-ink px-3 py-2 text-xs font-bold text-white transition hover:bg-pam-ink/90"
                  >
                    + Add review
                  </button>
                </div>
              </div>

              <div className="space-y-3 p-4 sm:p-5">
                {!reviews.length ? (
                  <div className="rounded-xl border-2 border-dashed border-pam-border bg-pam-warm px-6 py-12 text-center">
                    <p className="font-[family-name:var(--font-oswald)] text-xl text-pam-ink">
                      No reviews yet
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-pam-muted">
                      Add customer quotes or restore the sample set to populate
                      the home page section.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setReviews([newTestimonial()])}
                        className="rounded-lg bg-pam-red px-4 py-2.5 text-sm font-bold text-white"
                      >
                        Add first review
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReviews(DEFAULT_TESTIMONIALS.map((t) => ({ ...t })));
                          setSelected(0);
                        }}
                        className="rounded-lg border border-pam-border bg-white px-4 py-2.5 text-sm font-bold text-pam-ink"
                      >
                        Use samples
                      </button>
                    </div>
                  </div>
                ) : (
                  reviews.map((item, i) => {
                    const rowIssues = validationMap.get(i);
                    const active = selected === i;
                    const hasQuote = item.quote.trim().length > 0;

                    if (!active) {
                      return (
                        <button
                          key={`review-${i}`}
                          type="button"
                          onClick={() => setSelected(i)}
                          className="flex w-full items-center gap-3 rounded-xl border border-pam-border bg-white p-3 text-left transition hover:border-pam-red/30 hover:bg-pam-warm/80"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pam-sand text-xs font-bold text-pam-muted">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-pam-ink">
                              {item.name.trim() || "Untitled review"}
                            </p>
                            <p className="truncate text-xs text-pam-muted">
                              {hasQuote
                                ? item.quote.trim()
                                : "No review text yet"}
                            </p>
                          </div>
                          <StarRow rating={item.rating} />
                          {rowIssues?.length ? (
                            <span className="rounded-full bg-pam-red/10 px-2 py-0.5 text-[10px] font-bold text-pam-red">
                              Fix
                            </span>
                          ) : null}
                        </button>
                      );
                    }

                    return (
                      <div
                        key={`review-${i}`}
                        className="overflow-hidden rounded-xl border-2 border-pam-red/25 bg-white shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pam-border bg-pam-red/[0.04] px-4 py-3">
                          <p className="text-sm font-bold text-pam-ink">
                            Editing review {i + 1}
                          </p>
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              disabled={i === 0}
                              onClick={() => {
                                setReviews((list) => moveItem(list, i, i - 1));
                                setSelected(Math.max(0, i - 1));
                              }}
                              className="rounded-lg border border-pam-border bg-white px-2.5 py-1.5 text-xs font-bold text-pam-ink disabled:opacity-40"
                            >
                              Move up
                            </button>
                            <button
                              type="button"
                              disabled={i === reviews.length - 1}
                              onClick={() => {
                                setReviews((list) => moveItem(list, i, i + 1));
                                setSelected(Math.min(reviews.length - 1, i + 1));
                              }}
                              className="rounded-lg border border-pam-border bg-white px-2.5 py-1.5 text-xs font-bold text-pam-ink disabled:opacity-40"
                            >
                              Move down
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReviews((list) =>
                                  list.filter((_, idx) => idx !== i),
                                );
                                setSelected(Math.max(0, i - 1));
                              }}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-pam-red hover:bg-pam-red/5"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4 p-4 sm:p-5">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-1.5 block text-sm font-semibold text-pam-ink">
                                Customer name
                              </label>
                              <input
                                className="input-field rounded-xl"
                                value={item.name}
                                placeholder="e.g. Maya R."
                                onChange={(e) =>
                                  updateReview(i, { name: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-sm font-semibold text-pam-ink">
                                Area in Kigali
                              </label>
                              <input
                                className="input-field rounded-xl"
                                value={item.area}
                                list="kigali-areas"
                                placeholder="e.g. Remera"
                                onChange={(e) =>
                                  updateReview(i, { area: e.target.value })
                                }
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1.5 block text-sm font-semibold text-pam-ink">
                              Star rating
                            </label>
                            <StarPicker
                              value={item.rating}
                              onChange={(rating) => updateReview(i, { rating })}
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-sm font-semibold text-pam-ink">
                              What they said
                            </label>
                            <textarea
                              className="input-field min-h-28 rounded-xl leading-relaxed"
                              value={item.quote}
                              placeholder="Short quote — what they liked about the order."
                              onChange={(e) =>
                                updateReview(i, { quote: e.target.value })
                              }
                            />
                            <p className="mt-1.5 text-xs text-pam-muted">
                              {item.quote.trim().length} characters · keep it to
                              1–2 sentences
                            </p>
                          </div>

                          {rowIssues?.length ? (
                            <ul className="rounded-lg bg-pam-red/8 px-3 py-2 text-xs font-semibold text-pam-red">
                              {rowIssues.map((issue) => (
                                <li key={issue}>• {issue}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}

                <datalist id="kigali-areas">
                  {KIGALI_DELIVERY_AREAS.map((area) => (
                    <option key={area} value={area} />
                  ))}
                </datalist>

                {reviews.length > 0 && (
                  <div className="border-t border-pam-border pt-4">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void save()}
                      className="w-full rounded-xl bg-pam-red py-3 text-sm font-bold text-white disabled:opacity-60 sm:w-auto sm:px-6"
                    >
                      {saving ? "Saving…" : "Save all reviews"}
                    </button>
                  </div>
                )}
              </div>
            </AdminCard>

            <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
              <AdminCard className="overflow-hidden">
                <div className="border-b border-pam-border bg-pam-sand/40 px-4 py-3 sm:px-5">
                  <p className="text-sm font-bold text-pam-ink">Home page preview</p>
                  <p className="text-xs text-pam-muted">
                    Matches the customer-facing carousel.
                  </p>
                </div>
                <div className="bg-pam-warm p-4 sm:p-5">
                  {previewReview ? (
                    <ReviewCard review={previewReview} index={selected} />
                  ) : (
                    <p className="text-sm text-pam-muted">
                      Add a review to see the preview.
                    </p>
                  )}
                </div>
              </AdminCard>

              {reviews.length > 1 && (
                <AdminCard className="p-4 sm:p-5">
                  <p className="text-xs font-bold text-pam-muted uppercase tracking-wide">
                    Carousel order
                  </p>
                  <div className="mt-3 space-y-2">
                    {reviews.map((item, i) => (
                      <button
                        key={`order-${i}`}
                        type="button"
                        onClick={() => setSelected(i)}
                        className={`w-full text-left transition ${
                          selected === i ? "opacity-100" : "opacity-80 hover:opacity-100"
                        }`}
                      >
                        <ReviewCard review={item} index={i} compact />
                      </button>
                    ))}
                  </div>
                </AdminCard>
              )}

              <AdminCard className="p-4 sm:p-5">
                <p className="text-sm font-bold text-pam-ink">Related</p>
                <ul className="mt-3 space-y-2 text-sm text-pam-muted">
                  <li>Section title: “What customers say”</li>
                  <li>Swipes horizontally on mobile</li>
                </ul>
                <Link
                  href="/admin/home"
                  className="mt-4 inline-flex text-sm font-bold text-pam-red hover:underline"
                >
                  Edit promo banners →
                </Link>
              </AdminCard>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
