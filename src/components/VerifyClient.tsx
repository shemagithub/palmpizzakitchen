"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { MailIcon, ShieldIcon } from "@/components/icons";
import { api, setSession } from "@/lib/api";

function VerifyForm() {
  const router = useRouter();
  const search = useSearchParams();
  const emailParam = search.get("email") || "";
  const tokenParam = search.get("token") || "";

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [autoTried, setAutoTried] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    setEmail(emailParam);
  }, [emailParam]);

  const finishVerification = (data: {
    token: string;
    user: { id: number; name: string; email: string; role: string };
    message?: string;
    alreadyVerified?: boolean;
  }) => {
    setSession(data.token, data.user);
    setSuccess(
      data.message ||
        (data.alreadyVerified
          ? "Your email is already verified. Signing you in…"
          : "Email verified! Welcome to Palm Pizza Club."),
    );
    window.setTimeout(() => {
      router.replace(data.user.role === "admin" ? "/admin" : "/account");
    }, 900);
  };

  useEffect(() => {
    if (!tokenParam || !emailParam || autoTried) return;
    setAutoTried(true);
    void (async () => {
      setLoading(true);
      setError("");
      setExpired(false);
      try {
        const data = await api<{
          token: string;
          user: { id: number; name: string; email: string; role: string };
          message?: string;
          alreadyVerified?: boolean;
        }>("/auth/verify", {
          method: "POST",
          body: JSON.stringify({ email: emailParam, token: tokenParam }),
        });
        finishVerification(data);
      } catch (err) {
        const apiErr = err as Error & {
          data?: { expired?: boolean };
        };
        if (apiErr.data?.expired) {
          setExpired(true);
          setError(
            "This verification link expired. Request a new code below.",
          );
        } else {
          setError(
            apiErr.message ||
              "Link verification failed. Enter the 6-digit code from your email instead.",
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [tokenParam, emailParam, autoTried, router]);

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setExpired(false);
    if (!email.trim() || !email.includes("@")) {
      setError("Enter the email you signed up with.");
      return;
    }
    if (code.trim().length < 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      const data = await api<{
        token: string;
        user: { id: number; name: string; email: string; role: string };
        message?: string;
        alreadyVerified?: boolean;
      }>("/auth/verify", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
        }),
      });
      finishVerification(data);
    } catch (err) {
      const apiErr = err as Error & {
        data?: { expired?: boolean };
      };
      if (apiErr.data?.expired) {
        setExpired(true);
        setError("That code expired. Tap Resend code for a fresh one.");
      } else {
        setError(apiErr.message || "Verification failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError("");
    setSuccess("");
    setExpired(false);
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    setResending(true);
    try {
      const data = await api<{ message?: string }>("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setSuccess(
        data.message ||
          "A new 6-digit code was sent. Check your inbox and spam folder.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="soft-card overflow-hidden rounded-xl border border-pam-border bg-white">
      <div className="border-b border-pam-border px-6 py-6 md:px-8">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-pam-sand text-pam-red">
          <MailIcon className="h-5 w-5" />
        </span>
        <p className="mt-4 text-xs font-bold text-pam-muted">
          Verify your email
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-oswald)] text-3xl text-pam-ink md:text-4xl">
          Check your inbox
        </h1>
        <p className="mt-2 max-w-md text-sm text-pam-muted">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-pam-ink">
            {email || "your email"}
          </span>
          . Enter it below, or open the verify link in the email. Codes expire
          in 30 minutes.
        </p>
      </div>

      {tokenParam && loading && !success ? (
        <div className="px-6 py-8 text-center text-sm font-semibold text-pam-muted md:px-8">
          Verifying your email link…
        </div>
      ) : null}

      <form className="space-y-4 p-6 md:p-8" onSubmit={submitCode} noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-2xl bg-pam-red/10 px-4 py-3 text-sm font-medium text-pam-red"
          >
            {error}
            {expired ? (
              <button
                type="button"
                onClick={() => void resend()}
                disabled={resending}
                className="mt-2 block text-sm font-bold underline"
              >
                {resending ? "Sending new code…" : "Send a new code now"}
              </button>
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
          <label htmlFor="verify-email" className="mb-1.5 block text-sm font-semibold">
            Email
          </label>
          <input
            id="verify-email"
            className="input-field rounded-2xl"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
          />
        </div>

        <div>
          <label htmlFor="verify-code" className="mb-1.5 block text-sm font-semibold">
            Verification code
          </label>
          <input
            id="verify-code"
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

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pam-red py-3.5 text-sm font-bold text-white disabled:opacity-70"
        >
          <ShieldIcon className="h-4 w-4" />
          {loading ? "Verifying…" : "Verify account"}
        </button>

        <button
          type="button"
          disabled={resending}
          onClick={() => void resend()}
          className="w-full rounded-2xl bg-pam-sand py-3 text-sm font-bold text-pam-ink disabled:opacity-70"
        >
          {resending ? "Sending…" : "Resend code"}
        </button>

        <p className="text-center text-xs text-pam-muted">
          Wrong email?{" "}
          <Link href="/account?mode=signup" className="font-bold text-pam-red">
            Create account again
          </Link>
          {" · "}
          <Link href="/account" className="font-bold text-pam-red">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function VerifyClient() {
  return (
    <section className="bg-pam-warm py-10 md:py-16">
      <div className="mx-auto max-w-lg px-4 md:px-8">
        <Suspense
          fallback={
            <div className="h-80 animate-pulse rounded-[2rem] bg-pam-sand" />
          }
        >
          <VerifyForm />
        </Suspense>
      </div>
    </section>
  );
}
