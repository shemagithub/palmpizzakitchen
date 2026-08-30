"use client";

import MenuImageField from "@/components/admin/MenuImageField";
import PromoSizeFields from "@/components/admin/PromoSizeFields";
import { HERO_PROMO_TEMPLATES } from "@/data/home";
import {
  buildPromoSizePrices,
  promoSizeFormFromRecord,
} from "@/lib/offers";
import {
  emptyHeroSlide,
  parseHeroSlides,
  serializeHeroSlides,
  type HeroSlide,
} from "@/lib/siteSettings";

type Props = {
  value: string;
  onChange: (json: string) => void;
  onError?: (message: string) => void;
  /** Hide the section title when used inside a dedicated page */
  embedded?: boolean;
};

export default function HeroSlidesEditor({
  value,
  onChange,
  onError,
  embedded = false,
}: Props) {
  const slides = parseHeroSlides(value);

  const commit = (next: HeroSlide[]) => {
    onChange(serializeHeroSlides(next));
  };

  const update = (index: number, patch: Partial<HeroSlide>) => {
    commit(
      slides.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)),
    );
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    commit(next);
  };

  const remove = (index: number) => {
    if (slides.length <= 1) {
      onError?.("Keep at least one banner slide.");
      return;
    }
    commit(slides.filter((_, i) => i !== index));
  };

  const add = () => {
    if (slides.length >= 8) {
      onError?.("You can add up to 8 slides.");
      return;
    }
    commit([...slides, emptyHeroSlide()]);
  };

  const applyTemplate = (index: number, templateIndex: number) => {
    const row = HERO_PROMO_TEMPLATES[templateIndex];
    if (!row) return;
    update(index, {
      ...row,
      image: slides[index]?.image || "/promo-1.jpg",
    });
  };

  const addFromTemplate = (templateIndex: number) => {
    if (slides.length >= 8) {
      onError?.("You can add up to 8 slides.");
      return;
    }
    const row = HERO_PROMO_TEMPLATES[templateIndex];
    if (!row) return;
    commit([
      ...slides,
      {
        ...emptyHeroSlide(),
        ...row,
        image:
          templateIndex === 0
            ? "/promo-2.jpg"
            : templateIndex === 1
              ? "/promo-1.jpg"
              : "/promo-3.jpg",
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {!embedded ? (
          <div>
            <h2 className="font-[family-name:var(--font-oswald)] text-xl">
              Top banner slides
            </h2>
            <p className="mt-1 text-sm text-pam-muted">
              Each slide is a big photo with a short title and button. Upload a
              photo or paste a picture link, then save.
            </p>
          </div>
        ) : (
          <p className="text-sm text-pam-muted">
            Add photos, change titles, or reorder slides. Press Save changes
            when you are done.
          </p>
        )}
        <button
          type="button"
          onClick={add}
          className="rounded-xl bg-pam-ink px-3.5 py-2.5 text-sm font-bold text-white"
        >
          + Add slide
        </button>
      </div>

      <div className="rounded-2xl border border-pam-border/80 bg-white p-3 sm:p-4">
        <p className="text-xs font-bold tracking-wide text-pam-muted uppercase">
          Quick promo templates
        </p>
        <p className="mt-1 text-sm text-pam-muted">
          Start with a ready-made deal like{" "}
          <strong>Buy 1 burger, get 1 free</strong> — then upload your photo
          and save.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {HERO_PROMO_TEMPLATES.map((template, i) => (
            <button
              key={`tpl-${template.badge}-${i}`}
              type="button"
              onClick={() => addFromTemplate(i)}
              className="rounded-xl bg-pam-sand px-3 py-2 text-xs font-bold text-pam-ink ring-1 ring-pam-border hover:bg-pam-red/10"
            >
              + {template.dealLabel || template.badge}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {slides.map((slide, index) => (
          <div
            key={`hero-${index}`}
            className="rounded-2xl border border-pam-border/80 bg-pam-sand/40 p-3 sm:p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold tracking-wide text-pam-muted uppercase">
                Slide {index + 1}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <select
                  className="rounded-lg bg-white px-2 py-1.5 text-xs font-bold text-pam-ink ring-1 ring-pam-border"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value === "") return;
                    applyTemplate(index, Number(e.target.value));
                    e.target.value = "";
                  }}
                >
                  <option value="">Fill from template…</option>
                  {HERO_PROMO_TEMPLATES.map((template, i) => (
                    <option key={`opt-${i}`} value={String(i)}>
                      {template.dealLabel || template.badge}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-pam-ink ring-1 ring-pam-border disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === slides.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-pam-ink ring-1 ring-pam-border disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded-lg bg-pam-red/10 px-2.5 py-1.5 text-xs font-bold text-pam-red"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <MenuImageField
                label="Banner photo"
                value={slide.image}
                onChange={(url) => update(index, { image: url || "/promo-1.jpg" })}
                onError={onError}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold">
                    Small label (optional)
                  </label>
                  <input
                    className="input-field rounded-2xl"
                    value={slide.badge}
                    onChange={(e) => update(index, { badge: e.target.value })}
                    placeholder="LIMITED TIME OFFER"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Big title
                  </label>
                  <input
                    className="input-field rounded-2xl"
                    value={slide.title}
                    onChange={(e) => update(index, { title: e.target.value })}
                    placeholder="MORE CHEESE."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Second title line
                  </label>
                  <input
                    className="input-field rounded-2xl"
                    value={slide.accent}
                    onChange={(e) => update(index, { accent: e.target.value })}
                    placeholder="MORE HAPPINESS."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold">
                    Short description
                  </label>
                  <textarea
                    className="input-field min-h-20 rounded-2xl"
                    value={slide.copy}
                    onChange={(e) => update(index, { copy: e.target.value })}
                    placeholder="Buy any burger and get a second one free…"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Deal highlight (optional)
                  </label>
                  <input
                    className="input-field rounded-2xl"
                    value={slide.dealLabel || ""}
                    onChange={(e) =>
                      update(index, { dealLabel: e.target.value })
                    }
                    placeholder="Buy 1 · Get 1 Free"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Promo code (optional)
                  </label>
                  <input
                    className="input-field rounded-2xl uppercase"
                    value={slide.promoCode || ""}
                    onChange={(e) =>
                      update(index, { promoCode: e.target.value.toUpperCase() })
                    }
                    placeholder="BOGOBURGER"
                  />
                </div>

                <div className="sm:col-span-2">
                  <PromoSizeFields
                    form={promoSizeFormFromRecord(slide.sizePrices)}
                    onChange={(sizeForm) => {
                      const sizePrices = buildPromoSizePrices(sizeForm);
                      update(
                        index,
                        sizePrices ? { sizePrices } : { sizePrices: undefined },
                      );
                    }}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Button text
                  </label>
                  <input
                    className="input-field rounded-2xl"
                    value={slide.cta}
                    onChange={(e) => update(index, { cta: e.target.value })}
                    placeholder="Order Now →"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Button goes to
                  </label>
                  <input
                    className="input-field rounded-2xl"
                    value={slide.href}
                    onChange={(e) => update(index, { href: e.target.value })}
                    placeholder="/pizzas"
                  />
                  <p className="mt-1 text-[11px] text-pam-muted">
                    Examples: /pizzas · /combos · /offers
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
