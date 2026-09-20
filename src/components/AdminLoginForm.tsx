"use client";

import { useState, type FormEvent } from "react";
import { LockIcon, MailIcon, ShieldIcon } from "@/components/icons";
import { useAuthUser } from "@/hooks/useAuthUser";
import { loginWithCredentials, normalizeEmail } from "@/lib/authCredentials";

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

export default function AdminLoginForm() {
  const { user, isLoggedIn } = useAuthUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const customerSession =
    isLoggedIn && user && user.role !== "admin" ? user : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithCredentials(email, password, { requireAdmin: true });
      const next =
        typeof window !== "undefined"
          ? window.location.pathname || "/admin"
          : "/admin";
      window.location.replace(next);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not sign in. Check the admin email and password.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="soft-card w-full max-w-md rounded-3xl border border-pam-border bg-white p-5 text-left sm:p-6">
      <div className="text-center">
        <ShieldIcon className="mx-auto h-10 w-10 text-pam-red" />
        <h1 className="mt-3 font-[family-name:var(--font-oswald)] text-2xl text-pam-ink">
          Shop manager sign in
        </h1>
        <p className="mt-2 text-sm text-pam-muted">
          Use the admin email and password on this phone. Extra spaces from
          autofill are ignored.
        </p>
      </div>

      {customerSession && (
        <p className="mt-4 rounded-2xl border border-pam-gold/40 bg-pam-gold-soft px-4 py-3 text-sm text-pam-ink">
          This phone is signed in as{" "}
          <strong>{customerSession.email || "a customer"}</strong>, which is not
          the shop manager. Enter the admin account below to switch.
        </p>
      )}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-pam-red/25 bg-pam-red/10 px-4 py-3 text-sm font-medium text-pam-red"
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="admin-email" className="mb-1.5 block text-sm font-semibold">
            Admin email
          </label>
          <div className="relative">
            <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-muted" />
            <input
              id="admin-email"
              name="admin_email"
              className="input-field input-with-icon rounded-2xl"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmail(normalizeEmail(email) || email)}
              placeholder="admin@palmpizza.com"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="admin-password"
            className="mb-1.5 block text-sm font-semibold"
          >
            Password
          </label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-muted" />
            <input
              id="admin-password"
              name="admin_password"
              className="input-field input-with-icon input-with-icon-end rounded-2xl"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-pam-muted"
            >
              <EyeIcon open={showPassword} className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-2xl bg-pam-red py-3.5 text-sm font-bold text-white disabled:opacity-70"
        >
          {loading ? "Signing in…" : "Sign in as shop manager"}
        </button>
      </form>
    </div>
  );
}
