"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import PalmPickExperience from "@/components/PalmPickExperience";

export default function PalmPickSection() {
  return (
    <section className="border-y border-pam-border bg-pam-sand py-10 sm:py-14">
      <div className="mx-auto grid max-w-[1100px] gap-8 px-4 md:px-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div>
          <h2 className="font-[family-name:var(--font-oswald)] text-3xl text-pam-ink sm:text-4xl">
            Not sure what to order?
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-pam-muted sm:text-base">
            Answer three short questions and we&apos;ll suggest something from
            today&apos;s menu — same pizzas you see on the rest of the site.
          </p>
          <p className="mt-4 text-sm text-pam-muted">
            Takes about half a minute. No account needed.
          </p>
          <Link
            href="/pick"
            className="mt-5 inline-block rounded-lg bg-pam-red px-5 py-3 text-sm font-bold text-white"
          >
            Help me choose
          </Link>
        </div>
        <PalmPickExperience compactIntro />
      </div>
    </section>
  );
}

export function PalmPickFab() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const hidden =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/pick");
  if (hidden) return null;

  if (open) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-6">
        <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto">
          <PalmPickExperience onClose={() => setOpen(false)} />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="fixed bottom-[calc(5.6rem+env(safe-area-inset-bottom))] right-3 z-40 rounded-lg border border-pam-border bg-white px-4 py-2.5 text-sm font-bold text-pam-ink shadow-sm md:bottom-6 md:right-6"
      aria-label="Help me choose a pizza"
    >
      Help me choose
    </button>
  );
}
