"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LockIcon, MailIcon } from "@/components/icons";
import { api } from "@/lib/api";

function ForgotPasswordForm() {
  const search = useSearchParams();
  const [email, setEmail] = useState(search.get("email") || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromUrl = search.get("email");
    if (fromUrl) setEmail(fromUrl);
  }, [search]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter the email address on your account.");
      return;
    }
    setLoading(true);
    try {
      const data = await api<{ message?: string; email?: string }>(
        "/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email: trimmed }),
        },
      );
      setSuccess(
        data.message ||
          "If that account exists, reset instructions were sent to your email.",
      );
    } catch (err) {
      const apiErr = err as Error & {
        data?: { requiresVerification?: boolean; email?: string; message?: string };
      };
      if (apiErr.data?.requiresVerification) {
        setError(
          apiErr.data.message ||
            "Verify your email first. We sent a new verification code.",
        );
        window.setTimeout(() => {
          window.location.href = `/verify?email=${encodeURIComponent(
            apiErr.data?.email || trimmed,
          )}`;
        }, 1200);
        return;
      }
      setError(apiErr.message || "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="soft-card overflow-hidden rounded-xl border border-pam-border bg-white">
      <div className="border-b border-pam-border px-6 py-6 md:px-8">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-pam-sand text-pam-red">
          <LockIcon className="h-5 w-5" />
        </span>
        <p className="mt-4 text-xs font-bold text-pam-muted">Password reset</p>
        <h1 className="mt-2 font-[family-name:var(--font-oswald)] text-3xl text-pam-ink md:text-4xl">
          Forgot your password?
        </h1>
        <p className="mt-2 max-w-md text-sm text-pam-muted">
          Enter your account email. We&apos;ll send a 6-digit code and a link to
          choose a new password.
        </p>
      </div>

      <form className="space-y-4 p-6 md:p-8" onSubmit={submit} noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-2xl bg-pam-red/10 px-4 py-3 text-sm font-medium text-pam-red"
          >
            {error}
          </div>
        )}
        {success && (
          <div
            role="status"
            className="rounded-2xl bg-pam-basil/10 px-4 py-3 text-sm font-medium text-pam-basil"
          >
            {success}
            <p className="mt-2 text-xs text-pam-muted">
              Check your inbox and spam folder. The code expires in 30 minutes.
            </p>
            <Link
              href={`/account/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`}
              className="mt-3 inline-block text-sm font-bold text-pam-red underline"
            >
              Enter reset code →
            </Link>
          </div>
        )}

        <div>
          <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-semibold">
            Account email
          </label>
          <div className="relative">
            <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-muted" />
            <input
              id="forgot-email"
              className="input-field input-with-icon rounded-2xl"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-pam-red py-3.5 text-sm font-bold text-white disabled:opacity-70"
        >
          {loading ? "Sending…" : "Send reset instructions"}
        </button>

        <p className="text-center text-sm text-pam-muted">
          Remembered it?{" "}
          <Link href="/account" className="font-bold text-pam-red">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function ForgotPasswordClient() {
  return (
    <section className="relative overflow-hidden bg-pam-warm py-10 md:py-16">
      <div className="relative mx-auto max-w-lg px-4 md:px-8">
        <Suspense
          fallback={
            <div className="h-80 animate-pulse rounded-[2rem] bg-pam-sand" />
          }
        >
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </section>
  );
}
