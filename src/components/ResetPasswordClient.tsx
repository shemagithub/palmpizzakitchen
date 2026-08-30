"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockIcon, ShieldIcon } from "@/components/icons";
import { api, setSession } from "@/lib/api";

function EyeIcon({ open, className = "" }: { open: boolean; className?: string }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 3l18 18M10.5 10.7a3 3 0 004.2 4.2M9.9 5.2A10.4 10.4 0 0112 5c6.5 0 10 7 10 7a18.4 18.4 0 01-4.1 4.8M6.1 6.3A18.5 18.5 0 002 12s3.5 7 10 7c1.1 0 2.1-.2 3.1-.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const search = useSearchParams();
  const emailParam = search.get("email") || "";
  const tokenParam = search.get("token") || "";

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(emailParam);
  }, [emailParam]);

  const passwordHint = useMemo(() => {
    if (!password) return "";
    if (password.length < 8) return "Use at least 8 characters";
    return "Looks good";
  }, [password]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Enter the email on your account.");
      return;
    }
    if (!tokenParam && code.trim().length < 6) {
      setError("Enter the 6-digit code from your reset email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const data = await api<{
        message?: string;
        token?: string;
        user?: { id: number; name: string; email: string; role: string };
      }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: trimmedEmail,
          code: code.trim() || undefined,
          token: tokenParam || undefined,
          password,
        }),
      });
      if (data.token && data.user) {
        setSession(data.token, data.user);
      }
      setSuccess(data.message || "Password updated. Signing you in…");
      window.setTimeout(() => {
        router.replace(data.user?.role === "admin" ? "/admin" : "/account");
      }, 900);
    } catch (err) {
      const apiErr = err as Error & {
        data?: { expired?: boolean; requiresVerification?: boolean; email?: string };
      };
      if (apiErr.data?.expired) {
        setError(
          "This reset link expired. Request a new password reset email.",
        );
        return;
      }
      if (apiErr.data?.requiresVerification) {
        setError("Verify your email first, then reset your password.");
        window.setTimeout(() => {
          window.location.href = `/verify?email=${encodeURIComponent(
            apiErr.data?.email || trimmedEmail,
          )}`;
        }, 900);
        return;
      }
      setError(apiErr.message || "Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="soft-card overflow-hidden rounded-xl border border-pam-border bg-white">
      <div className="border-b border-pam-border px-6 py-6 md:px-8">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-pam-sand text-pam-red">
          <ShieldIcon className="h-5 w-5" />
        </span>
        <p className="mt-4 text-xs font-bold text-pam-muted">New password</p>
        <h1 className="mt-2 font-[family-name:var(--font-oswald)] text-3xl text-pam-ink md:text-4xl">
          Choose a new password
        </h1>
        <p className="mt-2 max-w-md text-sm text-pam-muted">
          {tokenParam
            ? "Your reset link is valid. Enter a new password below."
            : "Enter the 6-digit code from your email, then choose a new password."}
        </p>
      </div>

      <form className="space-y-4 p-6 md:p-8" onSubmit={submit} noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-2xl bg-pam-red/10 px-4 py-3 text-sm font-medium text-pam-red"
          >
            {error}
            {error.includes("expired") ? (
              <Link
                href={`/account/forgot-password?email=${encodeURIComponent(email.trim().toLowerCase())}`}
                className="mt-2 block text-sm font-bold underline"
              >
                Request a new reset email →
              </Link>
            ) : null}
          </div>
        )}
        {success && (
          <div
            role="status"
            className="rounded-2xl bg-pam-basil/10 px-4 py-3 text-sm font-medium text-pam-basil"
          >
            {success}
          </div>
        )}

        <div>
          <label htmlFor="reset-email" className="mb-1.5 block text-sm font-semibold">
            Email
          </label>
          <input
            id="reset-email"
            className="input-field rounded-2xl"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {!tokenParam ? (
          <div>
            <label htmlFor="reset-code" className="mb-1.5 block text-sm font-semibold">
              Reset code
            </label>
            <input
              id="reset-code"
              className="input-field rounded-2xl text-center font-mono text-2xl font-bold tracking-[0.35em]"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="••••••"
              required
            />
          </div>
        ) : (
          <p className="rounded-2xl bg-pam-sand/70 px-4 py-3 text-xs text-pam-muted">
            Reset link active for{" "}
            <span className="font-semibold text-pam-ink">{email || "your account"}</span>.
            You can still enter a code if you have one.
          </p>
        )}

        <div>
          <label htmlFor="reset-password" className="mb-1.5 block text-sm font-semibold">
            New password
          </label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-muted" />
            <input
              id="reset-password"
              className="input-field input-with-icon input-with-icon-end rounded-2xl"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <button
              type="button"
              aria-label="Toggle password"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-pam-muted"
            >
              <EyeIcon open={showPassword} className="h-4 w-4" />
            </button>
          </div>
          {passwordHint ? (
            <p className="mt-1.5 text-xs text-pam-muted">{passwordHint}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="reset-confirm" className="mb-1.5 block text-sm font-semibold">
            Confirm new password
          </label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-muted" />
            <input
              id="reset-confirm"
              className="input-field input-with-icon rounded-2xl"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pam-red py-3.5 text-sm font-bold text-white disabled:opacity-70"
        >
          <ShieldIcon className="h-4 w-4" />
          {loading ? "Saving…" : "Update password"}
        </button>

        <p className="text-center text-xs text-pam-muted">
          Need a new code?{" "}
          <Link
            href={`/account/forgot-password?email=${encodeURIComponent(email.trim().toLowerCase())}`}
            className="font-bold text-pam-red"
          >
            Resend reset email
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function ResetPasswordClient() {
  return (
    <section className="relative overflow-hidden bg-pam-warm py-10 md:py-16">
      <div className="relative mx-auto max-w-lg px-4 md:px-8">
        <Suspense
          fallback={
            <div className="h-80 animate-pulse rounded-[2rem] bg-pam-sand" />
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </section>
  );
}
