"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Avoid mounting heavy desktop + mobile trees at once */
export default function ViewportSwitch({
  mobile,
  desktop,
  fallback = null,
}: {
  mobile: ReactNode;
  desktop: ReactNode;
  /** Shown before matchMedia resolves (keeps header height stable) */
  fallback?: ReactNode;
}) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (isMobile === null) {
    return (
      fallback ?? (
        <div className="min-h-[50vh] animate-pulse bg-pam-sand/40" aria-hidden />
      )
    );
  }

  return <>{isMobile ? mobile : desktop}</>;
}
