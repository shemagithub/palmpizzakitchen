"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ResolvedMenuImage from "@/components/ResolvedMenuImage";
import PromoSizePriceRow from "@/components/PromoSizePriceRow";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { parseHeroSlides } from "@/lib/siteSettings";

const AUTO_MS = 4500;

export default function PromoCarousel() {
  const { settings } = useSiteSettings();
  const promos = useMemo(
    () => parseHeroSlides(settings.hero_slides),
    [settings.hero_slides],
  );

  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const drag = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
    pointerId: -1,
  });

  const go = useCallback(
    (i: number) => {
      const el = trackRef.current;
      if (!el || promos.length === 0) return;
      const next = ((i % promos.length) + promos.length) % promos.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    },
    [promos.length],
  );

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => {
      const width = el.clientWidth || 1;
      setIndex(Math.round(el.scrollLeft / width));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [promos.length]);

  useEffect(() => {
    if (paused || promos.length < 2) return;
    const id = window.setInterval(() => {
      go(index + 1);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [go, index, paused, promos.length]);

  useEffect(() => {
    setIndex(0);
    const el = trackRef.current;
    if (el) el.scrollTo({ left: 0 });
  }, [settings.hero_slides]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return;
    if (e.pointerType === "touch") {
      setPaused(true);
      return;
    }

    drag.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
      pointerId: e.pointerId,
    };

    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el || !drag.current.active) return;

    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 6) drag.current.moved = true;
    el.scrollLeft = drag.current.scrollLeft - dx;
  };

  const onPointerUpOrCancel = () => {
    const el = trackRef.current;
    if (!el || !drag.current.active) return;

    drag.current.active = false;

    const width = el.clientWidth || 1;
    const nearest = Math.round(el.scrollLeft / width);
    const next = Math.min(Math.max(0, nearest), promos.length - 1);
    el.scrollTo({ left: next * width, behavior: "smooth" });
  };

  if (promos.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => {
        window.setTimeout(() => setPaused(false), 2500);
      }}
    >
      <div
        ref={trackRef}
        role="region"
        aria-label="Promotions"
        aria-roledescription="carousel"
        className="swipe-track no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUpOrCancel}
        onPointerCancel={onPointerUpOrCancel}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {promos.map((promo, i) => (
          <div
            key={`${promo.title}-${i}`}
            className="relative min-h-[240px] w-full min-w-full shrink-0 snap-center snap-always sm:min-h-[320px] md:min-h-[420px] lg:min-h-[480px]"
          >
            <ResolvedMenuImage
              src={promo.image}
              alt={`${promo.title} ${promo.accent}`.trim()}
              fill
              priority={i === 0}
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

            <div className="relative z-10 mx-auto flex min-h-[240px] max-w-[1600px] items-center px-4 py-8 sm:min-h-[320px] sm:px-5 sm:py-10 md:min-h-[420px] md:px-8 md:py-14 lg:min-h-[480px]">
              <div className="max-w-2xl">
                <span className="inline-block rounded-md bg-pam-red px-3 py-1 text-xs font-bold text-white">
                  {promo.badge}
                </span>
                <p className="mt-3 max-w-[16rem] font-[family-name:var(--font-oswald)] text-[2rem] leading-tight text-white sm:mt-4 sm:max-w-none sm:text-4xl md:text-5xl">
                  {promo.title}
                  {promo.accent ? (
                    <span className="mt-0.5 block text-pam-gold">
                      {promo.accent}
                    </span>
                  ) : null}
                </p>
                {promo.copy ? (
                  <p className="mt-2 max-w-[18rem] text-xs leading-relaxed text-white/80 sm:mt-3 sm:max-w-md sm:text-sm md:mt-5 md:text-base lg:text-lg">
                    {promo.copy}
                  </p>
                ) : null}
                {promo.dealLabel || promo.promoCode ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4">
                    {promo.dealLabel ? (
                      <span className="rounded-full bg-pam-gold px-3 py-1 text-[10px] font-bold tracking-wide text-pam-ink uppercase">
                        {promo.dealLabel}
                      </span>
                    ) : null}
                    {promo.promoCode ? (
                      <span className="rounded-full bg-white/15 px-3 py-1 font-mono text-[10px] font-bold tracking-wide text-white backdrop-blur-sm">
                        {promo.promoCode}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {promo.sizePrices ? (
                  <PromoSizePriceRow
                    sizes={promo.sizePrices}
                    className="mt-3 sm:mt-4"
                  />
                ) : null}
                <Link
                  href={promo.href || "/pizzas"}
                  className="mt-4 inline-flex items-center gap-1 rounded-full bg-pam-red px-4 py-2.5 text-xs font-bold text-white transition hover:bg-pam-red-deep sm:mt-6 sm:rounded-sm sm:px-5 sm:py-3 sm:text-sm md:mt-8 md:px-6 md:py-3.5"
                >
                  {promo.cta || "Order Now →"}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {promos.length > 1 && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 sm:bottom-4 md:bottom-8">
          {promos.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Promo ${i + 1}`}
              onClick={() => go(i)}
              className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-5 bg-pam-red"
                  : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
