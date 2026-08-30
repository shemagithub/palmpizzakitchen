"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";

type Props = {
  children: ReactNode;
  className?: string;
  trackClassName?: string;
  /** Fixed card width in px for snap math (default 230) */
  itemWidth?: number;
  gap?: number;
  showDots?: boolean;
  /** Prev/next controls - useful on large screens */
  showArrows?: boolean;
  /** Bleed track to screen edges (default true) */
  bleed?: boolean;
  ariaLabel?: string;
};

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("a, button, input, textarea, select, label"));
}

export default function SwipeCarousel({
  children,
  className = "",
  trackClassName = "",
  itemWidth = 230,
  gap = 12,
  showDots = true,
  showArrows = false,
  bleed = true,
  ariaLabel = "Swipeable products",
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
    pointerId: -1,
  });
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(itemWidth + gap);

  const measureStep = useCallback(() => {
    const el = trackRef.current;
    const first = el?.children[0] as HTMLElement | undefined;
    if (first?.offsetWidth) {
      setStep(first.offsetWidth + gap);
    } else {
      setStep(itemWidth + gap);
    }
  }, [gap, itemWidth]);

  const updateIndex = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / step);
    const max = Math.max(0, el.children.length - 1);
    setIndex(Math.min(Math.max(0, next), max));
    setCount(el.children.length);
  }, [step]);

  useEffect(() => {
    measureStep();
    const el = trackRef.current;
    if (!el) return;
    updateIndex();
    el.addEventListener("scroll", updateIndex, { passive: true });
    window.addEventListener("resize", measureStep);
    return () => {
      el.removeEventListener("scroll", updateIndex);
      window.removeEventListener("resize", measureStep);
    };
  }, [updateIndex, measureStep, children]);

  useEffect(() => {
    updateIndex();
  }, [step, updateIndex]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Let links/buttons work - don't steal the gesture for drag
    if (isInteractiveTarget(e.target)) return;
    if (e.pointerType === "touch") return;

    const el = trackRef.current;
    if (!el) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
      pointerId: e.pointerId,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;

    if (!drag.current.moved && Math.abs(dx) > 8) {
      drag.current.moved = true;
      el.classList.add("is-dragging");
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }

    if (!drag.current.moved) return;
    el.scrollLeft = drag.current.scrollLeft - dx;
  };

  const endDrag = () => {
    const el = trackRef.current;
    if (!el || !drag.current.active) return;
    const moved = drag.current.moved;
    drag.current.active = false;
    el.classList.remove("is-dragging");
    try {
      el.releasePointerCapture(drag.current.pointerId);
    } catch {
      /* ignore */
    }

    if (moved) {
      const nearest = Math.round(el.scrollLeft / step);
      el.scrollTo({ left: nearest * step, behavior: "smooth" });
      const blockClick = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      el.addEventListener("click", blockClick, true);
      window.setTimeout(
        () => el.removeEventListener("click", blockClick, true),
        0,
      );
    }
  };

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const max = Math.max(0, el.children.length - 1);
    const next = Math.min(Math.max(0, i), max);
    el.scrollTo({ left: next * step, behavior: "smooth" });
  };

  const edge = bleed ? "-mx-3 px-3 sm:-mx-4 sm:px-4 md:mx-0 md:px-0" : "";
  const arrowPad = showArrows ? "md:px-8" : "";

  return (
    <div className={`relative ${className}`}>
      {showArrows && count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            disabled={index <= 0}
            onClick={() => goTo(index - 1)}
            className="absolute top-[42%] left-0 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-pam-border bg-white text-xl font-bold text-pam-ink shadow-md transition hover:border-pam-red hover:text-pam-red disabled:pointer-events-none disabled:opacity-30 md:flex"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next"
            disabled={index >= count - 1}
            onClick={() => goTo(index + 1)}
            className="absolute top-[42%] right-0 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-pam-border bg-white text-xl font-bold text-pam-ink shadow-md transition hover:border-pam-red hover:text-pam-red disabled:pointer-events-none disabled:opacity-30 md:flex"
          >
            ›
          </button>
        </>
      )}

      <div
        ref={trackRef}
        role="region"
        aria-label={ariaLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`swipe-track snap-start no-scrollbar flex overflow-x-auto overscroll-x-contain pb-2 ${edge} ${arrowPad} ${trackClassName}`}
        style={{ WebkitOverflowScrolling: "touch", gap }}
      >
        {children}
      </div>

      {showDots && count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to card ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-pam-red" : "w-1.5 bg-pam-border"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
