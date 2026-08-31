"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BagIcon,
  ClockIcon,
  HeartIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/icons";
import {
  useAuthUser,
  userAvatarUrl,
  userInitials,
} from "@/hooks/useAuthUser";
import { api, clearSession, setSession } from "@/lib/api";

type Mode = "login" | "signup";

const PERKS = [
  {
    title: "Order history",
    copy: "Track past and current deliveries",
    Icon: ClockIcon,
  },
  {
    title: "Faster reorder",
    copy: "Your details saved for next time",
    Icon: HeartIcon,
  },
  {
    title: "Secure checkout",
    copy: "Protected payments every time",
    Icon: ShieldIcon,
  },
];

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

export default function AccountForm({
  initialMode = "login",
}: {
  initialMode?: Mode;
}) {
  const router = useRouter();
  const { user, ready, isLoggedIn } = useAuthUser();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const fromUrl = searchParams.get("mode");
    if (fromUrl === "signup" || fromUrl === "create") setMode("signup");
  }, [searchParams]);

  const isSignup = mode === "signup";
  const avatar = userAvatarUrl(user);

  const passwordHint = useMemo(() => {
    if (!password) return "";
    if (password.length < 8) return "Use at least 8 characters";
    if (!/[0-9]/.test(password) || !/[a-zA-Z]/.test(password)) {
      return "Mix letters and numbers for a stronger password";
    }
    return "Looks good";
  }, [password]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setSuccess("");
    setPassword("");
    setConfirm("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next === "signup") url.searchParams.set("mode", "signup");
      else url.searchParams.delete("mode");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (isSignup) {
      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignup) {
        const data = await api<{
          requiresVerification?: boolean;
          email?: string;
          message?: string;
          token?: string;
          user?: { id: number; name: string; email: string; role: string };
        }>("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            email: trimmedEmail,
            phone: phone.trim(),
            password,
          }),
        });

        if (data.requiresVerification) {
          setSuccess(
            data.message ||
              "Account created - check your email for a verification code.",
          );
          window.setTimeout(() => {
            window.location.href = `/verify?email=${encodeURIComponent(
              data.email || trimmedEmail,
            )}`;
          }, 700);
          return;
        }

        if (data.token && data.user) {
          setSession(data.token, data.user);
          setSuccess(`Welcome, ${data.user.name.split(" ")[0]}!`);
          window.setTimeout(() => {
            window.location.href =
              data.user!.role === "admin" ? "/admin" : "/";
          }, 700);
        }
        return;
      }

      const data = await api<{
        token: string;
        user: { id: number; name: string; email: string; role: string };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      setSession(data.token, data.user);
      setSuccess(`Signed in as ${data.user.email}.`);

      if (data.user.role === "admin") {
        window.setTimeout(() => {
          window.location.href = "/admin";
        }, 700);
      } else {
        window.setTimeout(() => {
          window.location.href = "/";
        }, 500);
      }
    } catch (err) {
      const data =
        err && typeof err === "object" && "data" in err
          ? (err as { data?: { requiresVerification?: boolean; email?: string } })
              .data
          : undefined;
      if (data?.requiresVerification) {
        setError(
          "Please verify your email before signing in. Redirecting to verification…",
        );
        window.setTimeout(() => {
          window.location.href = `/verify?email=${encodeURIComponent(
            data.email || trimmedEmail,
          )}`;
        }, 600);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="soft-card rounded-[1.75rem] border border-pam-border/80 p-8 text-sm font-semibold text-pam-muted">
        Loading your account…
      </div>
    );
  }

  if (isLoggedIn && user) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
        <div className="soft-card overflow-hidden rounded-[1.75rem] border border-pam-border/80 bg-pam-surface">
          <div className="border-b border-pam-border px-5 py-6 md:px-7">
            <div className="flex items-center gap-4">
              {avatar && !avatarBroken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt=""
                  onError={() => setAvatarBroken(true)}
                  className="h-16 w-16 rounded-full object-cover ring-1 ring-pam-border"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-pam-sand font-[family-name:var(--font-oswald)] text-xl font-bold text-pam-ink ring-1 ring-pam-border">
                  {userInitials(user)}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-pam-muted">Signed in</p>
                <p className="mt-1 truncate font-[family-name:var(--font-oswald)] text-2xl text-pam-ink md:text-3xl">
                  {user.name || "Your profile"}
                </p>
                <p className="mt-1 truncate text-sm text-pam-muted">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-5 md:p-7">
            <Link
              href="/orders"
              className="flex items-center justify-between rounded-2xl bg-pam-sand/70 px-4 py-3.5 transition hover:bg-pam-sand"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-pam-red">
                  <ClockIcon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-pam-ink">
                    My orders
                  </span>
                  <span className="text-xs text-pam-muted">
                    Track and reorder past meals
                  </span>
                </span>
              </span>
              <span className="text-sm font-bold text-pam-red">Open →</span>
            </Link>

            <Link
              href="/cart"
              className="flex items-center justify-between rounded-2xl bg-pam-sand/70 px-4 py-3.5 transition hover:bg-pam-sand"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-pam-ink">
                  <BagIcon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-pam-ink">
                    My cart
                  </span>
                  <span className="text-xs text-pam-muted">Continue checkout</span>
                </span>
              </span>
              <span className="text-sm font-bold text-pam-red">Open →</span>
            </Link>

            {user.role === "admin" && (
              <Link
                href="/admin"
                className="flex items-center justify-between rounded-2xl bg-pam-ink px-4 py-3.5 text-white transition hover:bg-pam-ink/90"
              >
                <span>
                  <span className="block text-sm font-bold">Shop manager</span>
                  <span className="text-xs text-white/70">
                    Orders, menu, and website
                  </span>
                </span>
                <span className="text-sm font-bold">Open →</span>
              </Link>
            )}

            <div className="rounded-2xl border border-pam-border bg-pam-sand/40 p-4">
              <p className="text-sm font-bold text-pam-ink">Change password</p>
              <p className="mt-1 text-xs text-pam-muted">
                Or use{" "}
                <Link
                  href={`/account/forgot-password?email=${encodeURIComponent(user.email || "")}`}
                  className="font-bold text-pam-red"
                >
                  forgot password
                </Link>{" "}
                if you are signed out elsewhere.
              </p>
              {passwordError && (
                <p className="mt-2 text-xs font-semibold text-pam-red">
                  {passwordError}
                </p>
              )}
              {passwordMsg && (
                <p className="mt-2 text-xs font-semibold text-pam-basil">
                  {passwordMsg}
                </p>
              )}
              <div className="mt-3 space-y-2">
                <input
                  className="input-field rounded-xl text-sm"
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <input
                  className="input-field rounded-xl text-sm"
                  type="password"
                  placeholder="New password (8+ characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  disabled={passwordSaving}
                  onClick={() => {
                    void (async () => {
                      setPasswordMsg("");
                      setPasswordError("");
                      setPasswordSaving(true);
                      try {
                        const data = await api<{ message?: string }>(
                          "/auth/change-password",
                          {
                            method: "POST",
                            body: JSON.stringify({
                              currentPassword,
                              newPassword,
                            }),
                          },
                        );
                        setPasswordMsg(data.message || "Password updated.");
                        setCurrentPassword("");
                        setNewPassword("");
                      } catch (err) {
                        setPasswordError(
                          err instanceof Error
                            ? err.message
                            : "Could not update password.",
                        );
                      } finally {
                        setPasswordSaving(false);
                      }
                    })();
                  }}
                  className="w-full rounded-xl bg-pam-ink py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {passwordSaving ? "Saving…" : "Update password"}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                clearSession();
                router.push("/account");
              }}
              className="mt-2 w-full rounded-2xl border border-pam-red/25 bg-pam-red/8 py-3.5 text-sm font-bold text-pam-red transition hover:bg-pam-red/12"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="soft-card rounded-[1.75rem] border border-pam-border/80 bg-pam-sand/50 p-5">
          <p className="font-[family-name:var(--font-oswald)] text-xl text-pam-ink">
            Quick tips
          </p>
          <ul className="mt-4 space-y-3 text-sm text-pam-muted">
            <li>Use the profile icon in the header to open this menu anytime.</li>
            <li>My orders shows live delivery status after checkout.</li>
            <li>Log out on shared devices when you are done.</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
      <div className="soft-card overflow-hidden rounded-[1.75rem] border border-pam-border/80 bg-pam-surface">
        <div className="border-b border-pam-border px-5 py-6 md:px-7">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-pam-sand text-pam-red">
              <UserIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-[family-name:var(--font-oswald)] text-2xl text-pam-ink md:text-3xl">
                {isSignup ? "Create account" : "Sign in"}
              </p>
              <p className="mt-1 text-sm text-pam-muted">
                {isSignup
                  ? "We'll email you a code to verify your account."
                  : "Track orders and save your details for next time."}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 rounded-lg border border-pam-border bg-pam-sand/50 p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-md py-2.5 text-sm font-bold transition ${
                !isSignup ? "bg-white text-pam-ink shadow-sm" : "text-pam-muted"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`rounded-md py-2.5 text-sm font-bold transition ${
                isSignup ? "bg-white text-pam-ink shadow-sm" : "text-pam-muted"
              }`}
            >
              Create account
            </button>
          </div>
        </div>

        <form className="space-y-4 p-5 md:p-7" onSubmit={handleSubmit} noValidate>
          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-pam-red/25 bg-pam-red/10 px-4 py-3 text-sm font-medium text-pam-red"
            >
              {error}
            </div>
          )}
          {success && (
            <div
              role="status"
              className="rounded-2xl border border-pam-basil/25 bg-pam-basil/10 px-4 py-3 text-sm font-medium text-pam-basil"
            >
              {success}
            </div>
          )}

          {isSignup && (
            <div>
              <label htmlFor="account-name" className="mb-1.5 block text-sm font-semibold">
                Full name
              </label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-muted" />
                <input
                  id="account-name"
                  className="input-field input-with-icon rounded-2xl"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {isSignup && (
            <div>
              <label htmlFor="account-phone" className="mb-1.5 block text-sm font-semibold">
                Mobile number
              </label>
              <div className="relative">
                <PhoneIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-muted" />
                <input
                  id="account-phone"
                  className="input-field input-with-icon rounded-2xl"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0788302208"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="account-email" className="mb-1.5 block text-sm font-semibold">
              Email
            </label>
            <div className="relative">
              <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-muted" />
              <input
                id="account-email"
                className="input-field input-with-icon rounded-2xl"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="account-password" className="mb-1.5 block text-sm font-semibold">
              Password
            </label>
            <div className="relative">
              <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-muted" />
              <input
                id="account-password"
                className="input-field input-with-icon input-with-icon-end rounded-2xl"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
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
            {isSignup && passwordHint && (
              <p className="mt-1.5 text-xs text-pam-muted">{passwordHint}</p>
            )}
          </div>

          {isSignup && (
            <div>
              <label htmlFor="account-confirm" className="mb-1.5 block text-sm font-semibold">
                Confirm password
              </label>
              <div className="relative">
                <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pam-muted" />
                <input
                  id="account-confirm"
                  className="input-field input-with-icon input-with-icon-end rounded-2xl"
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-pam-muted"
                >
                  <EyeIcon open={showConfirm} className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {!isSignup && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2.5 text-sm text-pam-muted">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="accent-pam-red"
                />
                Keep me signed in
              </label>
              <Link
                href={`/account/forgot-password${email.trim() ? `?email=${encodeURIComponent(email.trim().toLowerCase())}` : ""}`}
                className="text-sm font-bold text-pam-red"
              >
                Forgot password?
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pam-red py-3.5 text-sm font-bold text-white disabled:opacity-70"
          >
            <UserIcon className="h-4 w-4" />
            {loading ? "Please wait…" : isSignup ? "Create my account" : "Sign in"}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="soft-card rounded-[1.75rem] border border-pam-border/80 bg-pam-sand/50 p-5">
          <p className="font-[family-name:var(--font-oswald)] text-xl text-pam-ink">
            With an account you can
          </p>
          <div className="mt-5 space-y-3">
            {PERKS.map(({ title, copy, Icon }) => (
              <div key={title} className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-pam-red shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold">{title}</p>
                  <p className="text-xs text-pam-muted">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Link
          href="/orders"
          className="soft-card flex items-center justify-between rounded-[1.75rem] border border-pam-border/80 p-4"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pam-red/10 text-pam-red">
              <ClockIcon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-bold">My orders</span>
              <span className="text-xs text-pam-muted">Track deliveries</span>
            </span>
          </span>
          <span className="text-sm font-bold text-pam-red">Open →</span>
        </Link>
        <Link
          href="/cart"
          className="soft-card flex items-center justify-between rounded-[1.75rem] border border-pam-border/80 p-4"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pam-gold-soft">
              <BagIcon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-bold">View your cart</span>
              <span className="text-xs text-pam-muted">Continue checkout</span>
            </span>
          </span>
          <span className="text-sm font-bold text-pam-red">Open →</span>
        </Link>
      </div>
    </div>
  );
}
