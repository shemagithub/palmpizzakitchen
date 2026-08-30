"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setNote("");
    try {
      await api("/newsletter", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setNote("You're on the list — thanks.");
      setEmail("");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not subscribe.");
    }
  };

  return (
    <section className="border-t border-pam-border bg-pam-sand px-4 py-10 md:px-8 md:py-12">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-md">
          <h2 className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink md:text-3xl">
            Deals & new menu items
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-pam-muted">
            Occasional emails when we add combos or run a special. Unsubscribe
            anytime.
          </p>
        </div>

        <form className="w-full max-w-md" onSubmit={onSubmit}>
          <label htmlFor="footer-email" className="sr-only">
            Email address
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="footer-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="input-field flex-1 rounded-lg text-sm"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-pam-red px-5 py-3 text-sm font-bold text-white"
            >
              Subscribe
            </button>
          </div>
          {note ? (
            <p className="mt-2 text-xs text-pam-muted">{note}</p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
