"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";

export default function ContactForm() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setStatus("");
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await api("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          message: form.get("message"),
        }),
      });
      setStatus("Message sent - we’ll get back soon.");
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="space-y-4 border border-pam-border bg-pam-surface p-6"
      onSubmit={onSubmit}
    >
      {error && <p className="text-sm text-pam-red">{error}</p>}
      {status && <p className="text-sm text-pam-basil">{status}</p>}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-pam-ink">
          Name
        </label>
        <input className="input-field" name="name" required />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-pam-ink">
          Email
        </label>
        <input className="input-field" type="email" name="email" required />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-pam-ink">
          Message
        </label>
        <textarea
          className="input-field min-h-32 resize-y"
          name="message"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-sm bg-pam-red py-3 text-sm font-bold text-white transition hover:bg-pam-red-deep disabled:opacity-70"
      >
        {loading ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
