"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import ResolvedMenuImage from "@/components/ResolvedMenuImage";

type Props = {
  name: string;
  images: string[];
};

export default function ProductGallery({ name, images }: Props) {
  const photos = images.length > 0 ? images : [];
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const fullTrackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const mouseDrag = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });
  const thumbDrag = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });
  const tapGuard = useRef({ moved: false });

  useEffect(() => setMounted(true), []);

  const scrollToIndex = useCallback(
    (el: HTMLDivElement | null, index: number, smooth = true) => {
      if (!el || photos.length === 0) return;
      const next = ((index % photos.length) + photos.length) % photos.length;
      el.scrollTo({
        left: next * el.clientWidth,
        behavior: smooth ? "smooth" : "auto",
      });
    },
    [photos.length],
  );

  const go = useCallback(
    (index: number, smooth = true) => {
      if (photos.length === 0) return;
      const next = ((index % photos.length) + photos.length) % photos.length;
      setActive(next);
      scrollToIndex(trackRef.current, next, smooth);
      if (fullscreen) {
        scrollToIndex(fullTrackRef.current, next, smooth);
      }
    },
    [photos.length, fullscreen, scrollToIndex],
  );

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const onScroll = () => {
      const width = el.clientWidth || 1;
      const next = Math.round(el.scrollLeft / width);
      setActive(Math.min(Math.max(0, next), photos.length - 1));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [photos.length]);

  useEffect(() => {
    if (!fullscreen) return;
    const el = fullTrackRef.current;
    if (!el) return;

    // Sync fullscreen track to current slide without animation
    scrollToIndex(el, active, false);

    const onScroll = () => {
      const width = el.clientWidth || 1;
      const next = Math.round(el.scrollLeft / width);
      setActive(Math.min(Math.max(0, next), photos.length - 1));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [fullscreen, photos.length, scrollToIndex]); // eslint-disable-line react-hooks/exhaustive-deps -- sync once on open

  useEffect(() => {
    const thumb = thumbRef.current;
    if (!thumb) return;
    const btn = thumb.children[active] as HTMLElement | undefined;
    btn?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [active]);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === "ArrowLeft") go(active - 1);
      if (e.key === "ArrowRight") go(active + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen, active, go]);

  const bindDrag = (getEl: () => HTMLDivElement | null) => {
    const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = getEl();
      if (!el) return;

      // Native touch scrolling handles swipe; only drag with mouse/pen
      if (e.pointerType === "touch") return;

      mouseDrag.current = {
        active: true,
        startX: e.clientX,
        scrollLeft: el.scrollLeft,
        moved: false,
      };
      el.setPointerCapture(e.pointerId);
      el.classList.add("is-dragging");
    };

    const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = getEl();
      if (!el || !mouseDrag.current.active) return;
      if (Math.abs(e.clientX - mouseDrag.current.startX) > 6) {
        mouseDrag.current.moved = true;
      }
      el.scrollLeft =
        mouseDrag.current.scrollLeft - (e.clientX - mouseDrag.current.startX);
    };

    const finish = (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = getEl();
      if (!el || !mouseDrag.current.active) return;

      const moved = mouseDrag.current.moved;
      mouseDrag.current.active = false;
      mouseDrag.current.moved = false;
      el.classList.remove("is-dragging");
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const width = el.clientWidth || 1;
      go(Math.round(el.scrollLeft / width));

      // Mark so click handler can ignore drag-end clicks
      tapGuard.current.moved = moved;
    };

    return {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    };
  };

  const mainDrag = bindDrag(() => trackRef.current);
  const fullDrag = bindDrag(() => fullTrackRef.current);

  const openFullscreen = () => {
    if (tapGuard.current.moved) {
      tapGuard.current.moved = false;
      return;
    }
    setFullscreen(true);
  };

  if (photos.length === 0) return null;

  const lightbox =
    mounted &&
    fullscreen &&
    createPortal(
      <div
        className="fixed inset-0 z-[120] flex flex-col bg-black/95"
        role="dialog"
        aria-modal="true"
        aria-label={`${name} fullscreen gallery`}
      >
        <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:px-5">
          <p className="min-w-0 truncate text-sm font-semibold">
            {name}
            <span className="ml-2 font-normal text-white/60">
              {active + 1} / {photos.length}
            </span>
          </p>
          <button
            type="button"
            aria-label="Close fullscreen"
            onClick={() => setFullscreen(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl font-bold hover:bg-white/25"
          >
            ×
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            ref={fullTrackRef}
            role="region"
            aria-label={`${name} photos - swipe left or right`}
            {...fullDrag}
          className="swipe-track no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y" }}
          >
            {photos.map((src, index) => (
              <div
                key={`full-${src}-${index}`}
                className="relative flex h-full w-full min-w-full shrink-0 snap-center snap-always items-center justify-center px-2"
              >
                <div className="relative h-[min(78vh,100%)] w-full max-w-5xl">
                  <ResolvedMenuImage
                    src={src}
                    alt={`${name} photo ${index + 1}`}
                    fill
                    className="pointer-events-none object-contain"
                    sizes="100vw"
                    draggable={false}
                  />
                </div>
              </div>
            ))}
          </div>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => go(active - 1)}
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white sm:left-4"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => go(active + 1)}
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white sm:right-4"
              >
                ›
              </button>
            </>
          )}
        </div>

        {photos.length > 1 && (
          <div className="flex justify-center gap-1.5 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {photos.map((_, i) => (
              <button
                key={`dot-${i}`}
                type="button"
                aria-label={`Go to photo ${i + 1}`}
                onClick={() => go(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? "w-5 bg-pam-red" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>,
      document.body,
    );

  return (
    <div className="w-full min-w-0 space-y-2.5 sm:space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-pam-border bg-pam-sand sm:rounded-3xl lg:rounded-[1.75rem]">
        <div
          ref={trackRef}
          role="region"
          aria-label={`${name} photos - swipe left or right, tap for fullscreen`}
          {...mainDrag}
          onClick={openFullscreen}
          className="swipe-track no-scrollbar flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto overscroll-x-contain sm:aspect-square"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y" }}
        >
          {photos.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="relative aspect-[4/3] w-full min-w-full shrink-0 snap-center snap-always sm:aspect-square"
            >
              <ResolvedMenuImage
                src={src}
                alt={`${name} photo ${index + 1}`}
                fill
                priority={index === 0}
                className="pointer-events-none object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 640px"
                draggable={false}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          aria-label="View fullscreen"
          onClick={() => setFullscreen(true)}
          className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-pam-black/65 text-white shadow-sm backdrop-blur-sm hover:bg-pam-black/80"
        >
          <ExpandIcon />
        </button>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => go(active - 1)}
              className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-pam-surface/90 text-lg font-bold text-pam-ink shadow-sm transition hover:bg-white sm:left-3 sm:h-10 sm:w-10"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => go(active + 1)}
              className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-pam-surface/90 text-lg font-bold text-pam-ink shadow-sm transition hover:bg-white sm:right-3 sm:h-10 sm:w-10"
            >
              ›
            </button>
            <p className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full bg-pam-black/70 px-2.5 py-1 text-xs font-semibold text-white">
              {active + 1} / {photos.length}
            </p>
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === active ? "w-4 bg-pam-red" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div
          ref={thumbRef}
          role="listbox"
          aria-label={`${name} photo thumbnails - swipe left or right`}
          className="thumb-track no-scrollbar -mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y" }}
          onPointerDown={(e) => {
            if (e.pointerType === "touch") return;
            const el = thumbRef.current;
            if (!el) return;
            thumbDrag.current = {
              active: true,
              startX: e.clientX,
              scrollLeft: el.scrollLeft,
              moved: false,
            };
            el.setPointerCapture(e.pointerId);
            el.classList.add("is-dragging");
          }}
          onPointerMove={(e) => {
            const el = thumbRef.current;
            if (!el || !thumbDrag.current.active) return;
            const dx = e.clientX - thumbDrag.current.startX;
            if (Math.abs(dx) > 4) thumbDrag.current.moved = true;
            el.scrollLeft = thumbDrag.current.scrollLeft - dx;
          }}
          onPointerUp={(e) => {
            const el = thumbRef.current;
            if (!el || !thumbDrag.current.active) return;
            thumbDrag.current.active = false;
            el.classList.remove("is-dragging");
            try {
              el.releasePointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
          }}
          onPointerCancel={(e) => {
            const el = thumbRef.current;
            if (!el || !thumbDrag.current.active) return;
            thumbDrag.current.active = false;
            el.classList.remove("is-dragging");
            try {
              el.releasePointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
          }}
        >
          {photos.map((src, index) => (
            <button
              key={`${src}-thumb-${index}`}
              type="button"
              role="option"
              aria-selected={index === active}
              aria-label={`View photo ${index + 1}`}
              onClick={() => {
                if (thumbDrag.current.moved) {
                  thumbDrag.current.moved = false;
                  return;
                }
                go(index);
              }}
              className={`relative aspect-square w-[68px] shrink-0 overflow-hidden rounded-xl border transition sm:w-[72px] ${
                index === active
                  ? "border-pam-red ring-1 ring-pam-red"
                  : "border-pam-border hover:border-pam-muted"
              }`}
            >
              <ResolvedMenuImage
                src={src}
                alt={`${name} thumbnail ${index + 1}`}
                fill
                className="pointer-events-none object-cover"
                sizes="80px"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}

      {lightbox}
    </div>
  );
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
