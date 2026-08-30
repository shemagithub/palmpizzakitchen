"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Category = {
  slug: string;
  title: string;
};

type Props = {
  categories: readonly Category[];
};

export default function CategoryTabs({ categories }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("category");
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
    pointerId: -1,
  });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const activeEl = track.querySelector<HTMLElement>("[data-active='true']");
    activeEl?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [active]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Only custom-drag with mouse/pen; touch uses native overflow scroll.
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
    el.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 6) drag.current.moved = true;
    el.scrollLeft = drag.current.scrollLeft - dx;
  };

  const endDrag = () => {
    const el = trackRef.current;
    if (!el || !drag.current.active) return;
    drag.current.active = false;
    setDragging(false);
    try {
      el.releasePointerCapture(drag.current.pointerId);
    } catch {
      /* ignore */
    }
    if (drag.current.moved) {
      const blockClick = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      el.addEventListener("click", blockClick, true);
      window.setTimeout(() => el.removeEventListener("click", blockClick, true), 0);
    }
  };

  const tabClass = (isActive: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition ${
      isActive
        ? "bg-pam-red text-white shadow-sm"
        : "bg-white text-pam-muted ring-1 ring-pam-border hover:text-pam-ink"
    }`;

  return (
    <div className="relative mb-8 md:mb-8">
      {/* Fade edges - cue that the row slides */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-pam-warm to-transparent md:hidden"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-pam-warm to-transparent md:hidden"
        aria-hidden
      />

      <div
        ref={trackRef}
        role="navigation"
        aria-label="Pizza categories"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`category-tabs-track no-scrollbar -mx-5 flex gap-2 overflow-x-auto overscroll-x-contain px-5 pb-1 md:mx-0 md:flex-wrap md:gap-2 md:overflow-visible md:px-0 ${
          dragging ? "cursor-grabbing select-none" : "cursor-grab md:cursor-default"
        }`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <Link
          href={pathname}
          data-active={!active ? "true" : undefined}
          className={tabClass(!active)}
        >
          All
        </Link>
        {categories.map((cat) => {
          const isActive = active === cat.slug;
          return (
            <Link
              key={cat.slug}
              href={`${pathname}?category=${cat.slug}`}
              data-active={isActive ? "true" : undefined}
              className={tabClass(isActive)}
            >
              {cat.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
