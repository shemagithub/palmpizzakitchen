"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  AdminAlert,
  AdminCard,
  AdminHelpTip,
  AdminPageHeader,
  AdminSkeleton,
} from "@/components/admin/AdminUI";
import { formatPrice } from "@/data/menu";
import { api } from "@/lib/api";

type Provider = { id: string; name: string };
type Payout = {
  id: number;
  reference: string;
  amount: number;
  recipientName: string;
  msisdn: string;
  status: string;
  statusMessage?: string;
  createdAt: string;
};

const DEFAULT_PROVIDERS: Provider[] = [
  { id: "63510", name: "MTN Mobile Money (078 / 079)" },
  { id: "63514", name: "Airtel Rwanda (072 / 073)" },
];

function detectProviderId(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  const local =
    digits.startsWith("250") && digits.length >= 12
      ? `0${digits.slice(3, 12)}`
      : digits.startsWith("7") && digits.length === 9
        ? `0${digits}`
        : digits.slice(0, 10);
  if (/^07[23]\d{7}$/.test(local)) return "63514";
  if (/^07[89]\d{7}$/.test(local)) return "63510";
  return "";
}

export default function AdminPayoutsPage() {
  const [providers, setProviders] = useState<Provider[]>(DEFAULT_PROVIDERS);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [msisdn, setMsisdn] = useState("");
  const [amount, setAmount] = useState("");
  const [telecomProviderId, setTelecomProviderId] = useState("63510");
  const [validatedName, setValidatedName] = useState("");
  const [validatedMsisdn, setValidatedMsisdn] = useState("");
  const [validatedAmount, setValidatedAmount] = useState<number | null>(null);
  const [pendingReference, setPendingReference] = useState("");
  const [payoutAlreadyInitiated, setPayoutAlreadyInitiated] = useState(false);
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [sending, setSending] = useState(false);
  const [balance, setBalance] = useState<{
    available?: boolean;
    balance?: number | null;
    walletBalance?: number | null;
    walletId?: number | string | null;
    collected?: number;
    paidOut?: number;
    reserved?: number;
    shopBalance?: number;
    currency?: string;
    businessName?: string | null;
    live?: boolean;
    source?: string;
    walletError?: string | null;
    error?: string;
  } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const resetValidation = () => {
    setValidatedName("");
    setValidatedMsisdn("");
    setValidatedAmount(null);
    setPendingReference("");
    setPayoutAlreadyInitiated(false);
    setNameConfirmed(false);
  };

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const data = await api<{
        available?: boolean;
        balance?: number | null;
        walletBalance?: number | null;
        walletId?: number | string | null;
        collected?: number;
        paidOut?: number;
        reserved?: number;
        shopBalance?: number;
        currency?: string;
        businessName?: string | null;
        live?: boolean;
        source?: string;
        walletError?: string | null;
        error?: string;
      }>("/payouts/balance");
      setBalance(data);
    } catch (err) {
      setBalance({
        available: false,
        balance: null,
        currency: "RWF",
        error:
          err instanceof Error ? err.message : "Could not load wallet balance.",
      });
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const providerData = await api<{ mobileMoney: Provider[] }>(
        "/payouts/providers",
      ).catch(() => null);
      if (providerData?.mobileMoney?.length) {
        setProviders(providerData.mobileMoney);
      }
      const list = await api<{ payouts: Payout[] }>("/payouts");
      setPayouts(list.payouts || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payouts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadBalance();
  }, [load, loadBalance]);

  const validateName = async () => {
    setError("");
    setNotice("");
    resetValidation();
    setValidating(true);
    try {
      const autoProvider = detectProviderId(msisdn) || telecomProviderId;
      if (autoProvider !== telecomProviderId) {
        setTelecomProviderId(autoProvider);
      }
      const data = await api<{
        name: string;
        msisdn: string;
        customerReference?: string | null;
        telecomProviderId?: string;
        statusMessage?: string;
        nameValidated?: boolean;
        initiated?: boolean;
        amount?: number;
      }>("/payouts/name-check", {
        method: "POST",
        body: JSON.stringify({
          msisdn,
          amount: Number(amount),
          telecomProviderId: autoProvider,
        }),
      });
      setValidatedName(data.name);
      setValidatedMsisdn(data.msisdn);
      setValidatedAmount(Number(data.amount ?? amount));
      setMsisdn(data.msisdn);
      if (data.telecomProviderId) {
        setTelecomProviderId(String(data.telecomProviderId));
      }
      setPendingReference(data.customerReference || "");
      setPayoutAlreadyInitiated(Boolean(data.initiated && data.customerReference));
      setNotice(
        data.statusMessage ||
          `Registered MoMo name: ${data.name}. Confirm it is the right person.`,
      );
      await load();
    } catch (err) {
      const apiErr = err as Error & {
        data?: { details?: { message?: string } };
      };
      const detail = apiErr.data?.details?.message;
      setError(
        detail
          ? `${apiErr.message}${detail !== apiErr.message ? ` (${detail})` : ""}`
          : apiErr.message || "Could not validate this name.",
      );
    } finally {
      setValidating(false);
    }
  };

  const submit = async () => {
    setError("");
    setNotice("");
    if (!validatedName || !nameConfirmed) {
      setError("Validate the name and confirm it before finishing.");
      return;
    }
    if (
      validatedAmount != null &&
      Math.round(Number(amount)) !== Math.round(validatedAmount)
    ) {
      setError("Amount changed after validation. Click Validate name again.");
      return;
    }
    setSending(true);
    try {
      const data = await api<{
        payout: {
          reference: string;
          statusMessage: string;
          validatedAccountName?: string;
          otpRequired?: boolean;
          status?: string;
        };
      }>("/payouts", {
        method: "POST",
        body: JSON.stringify({
          recipientName: validatedName,
          msisdn: validatedMsisdn || msisdn,
          amount: validatedAmount ?? Number(amount),
          telecomProviderId,
          nameConfirmed: true,
          customerReference: pendingReference || undefined,
        }),
      });
      setNotice(
        data.payout.otpRequired || data.payout.status === "pending"
          ? `${data.payout.statusMessage} Reference: ${data.payout.reference}.`
          : data.payout.statusMessage ||
              `Payout ${data.payout.status || "submitted"} for ${data.payout.validatedAccountName || validatedName}.`,
      );
      setMsisdn("");
      setAmount("");
      resetValidation();
      await load();
      await loadBalance();
    } catch (err) {
      const apiErr = err as Error & {
        data?: { details?: { message?: string } };
      };
      const detail = apiErr.data?.details?.message;
      setError(
        detail
          ? `${apiErr.message}${detail !== apiErr.message ? ` (${detail})` : ""}`
          : apiErr.message || "Payout failed.",
      );
    } finally {
      setSending(false);
    }
  };

  const refreshStatus = async (reference: string) => {
    try {
      await api(`/payouts/${encodeURIComponent(reference)}/status`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status check failed.");
    }
  };

  const canValidate =
    Boolean(msisdn.trim()) && Number(amount) >= 100 && !validating && !sending;
  const canPayout =
    Boolean(validatedName && nameConfirmed) && !sending && !validating;
  const balanceFromWallet = balance?.source === "xentripay";
  const displayBalance =
    balance?.balance != null
      ? Number(balance.balance)
      : balance?.shopBalance != null
        ? Number(balance.shopBalance)
        : null;

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Money out"
        title="Payouts"
        subtitle="Enter the number and amount, then validate the MoMo name. XentriPay returns the registered name. Confirm it, then confirm the OTP they send to the business phone or email."
      />
      <AdminHelpTip title="How payouts work (XentriPay)">
        <ol className="list-decimal space-y-1 pl-4">
          <li>Enter the recipient phone (local format, e.g. 0788302208) and amount (min 100 RWF).</li>
          <li>Click <strong>Validate name</strong> — XentriPay returns the registered MoMo name.</li>
          <li>Tick the confirm box, then click <strong>Confirm payout</strong>.</li>
          <li>
            Approve the <strong>OTP</strong> XentriPay sends to the business account email or phone.
            The payout stays pending until that OTP is confirmed.
          </li>
        </ol>
      </AdminHelpTip>
      {error && <AdminAlert>{error}</AdminAlert>}
      {notice && <AdminAlert tone="ok">{notice}</AdminAlert>}

      <div className="mb-4 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#1a1512] via-[#3b1014] to-pam-red p-5 text-white shadow-[0_20px_50px_rgba(227,24,55,0.22)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-white/60 uppercase">
              {balanceFromWallet ? "XentriPay wallet" : "Available balance"}
            </p>
            <p className="mt-1 text-sm text-white/80">
              {balance?.businessName || "Palm Pizza Kitchen"}
              {balance?.live === false ? " · test" : " · live"}
              {balanceFromWallet && balance?.walletId
                ? ` · wallet ${balance.walletId}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadBalance()}
            className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/25"
          >
            {balanceLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <p className="mt-5 font-[family-name:var(--font-oswald)] text-4xl tracking-wide sm:text-5xl">
          {balanceLoading
            ? "…"
            : displayBalance != null
              ? formatPrice(displayBalance)
              : "—"}
        </p>
        <p className="mt-2 text-sm text-white/70">
          {balanceFromWallet
            ? "Live balance from your XentriPay merchant wallet — the amount you can send out now."
            : "Estimated from paid orders minus completed and pending payouts. Set XENTRIPAY_WALLET_ID in backend/.env if this does not match XentriPay."}
        </p>
        {balance?.walletError ? (
          <p className="mt-2 text-xs text-amber-100/90">
            Could not read XentriPay wallet: {balance.walletError}
          </p>
        ) : null}
        {balance?.error ? (
          <p className="mt-2 text-xs text-amber-100/90">{balance.error}</p>
        ) : null}
        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 px-3 py-2">
            <p className="text-white/55">Collected</p>
            <p className="mt-0.5 font-bold">
              {formatPrice(Number(balance?.collected || 0))}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2">
            <p className="text-white/55">Paid out</p>
            <p className="mt-0.5 font-bold">
              {formatPrice(Number(balance?.paidOut || 0))}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2">
            <p className="text-white/55">Held (pending payout)</p>
            <p className="mt-0.5 font-bold">
              {formatPrice(Number(balance?.reserved || 0))}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <AdminCard className="space-y-4 p-4 sm:p-5">
          <h2 className="font-[family-name:var(--font-oswald)] text-xl">
            Send a payout
          </h2>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Provider</label>
            <select
              className="input-field rounded-2xl"
              value={telecomProviderId}
              disabled={Boolean(validatedName)}
              onChange={(e) => {
                setTelecomProviderId(e.target.value);
                resetValidation();
              }}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Mobile number
            </label>
            <input
              className="input-field rounded-2xl"
              value={msisdn}
              disabled={Boolean(validatedName)}
              onChange={(e) => {
                const next = e.target.value;
                setMsisdn(next);
                resetValidation();
                const detected = detectProviderId(next);
                if (detected) setTelecomProviderId(detected);
              }}
              placeholder="0788302208"
              inputMode="tel"
              autoComplete="tel"
            />
            <p className="mt-1 text-[11px] text-pam-muted">
              Network is auto-selected: MTN (078/079) or Airtel (072/073).
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Amount (RWF)
            </label>
            <input
              className="input-field rounded-2xl"
              inputMode="numeric"
              value={amount}
              disabled={Boolean(validatedName)}
              onChange={(e) => {
                setAmount(e.target.value);
                resetValidation();
              }}
              placeholder="5000"
            />
          </div>
          <button
            type="button"
            disabled={!canValidate}
            onClick={() => void validateName()}
            className="rounded-2xl border-2 border-pam-red bg-white px-4 py-3 text-sm font-bold text-pam-red disabled:opacity-60"
          >
            {validating ? "Validating name…" : "Validate name"}
          </button>

          {validatedName ? (
            <div className="rounded-2xl border border-pam-basil/30 bg-pam-basil/10 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-pam-basil">
                Name validated
              </p>
              <p className="mt-1 text-lg font-bold text-pam-ink">{validatedName}</p>
              <p className="text-xs text-pam-muted">
                {validatedMsisdn}
                {validatedAmount != null
                  ? ` · ${formatPrice(validatedAmount)}`
                  : ""}
                {pendingReference ? ` · ${pendingReference}` : ""}
              </p>
              {payoutAlreadyInitiated ? (
                <p className="mt-2 text-xs text-pam-basil">
                  This payout was already submitted to XentriPay during name
                  validation. Confirm payout will remind you to approve the OTP
                  — no second transfer is created.
                </p>
              ) : null}
              <label className="mt-3 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={nameConfirmed}
                  onChange={(e) => setNameConfirmed(e.target.checked)}
                />
                <span>
                  This is the right person. I will confirm the XentriPay OTP.
                </span>
              </label>
            </div>
          ) : (
            <p className="text-xs text-pam-muted">
              Enter the number and amount, then validate. The registered MoMo
              name will show here.
            </p>
          )}

          <button
            type="button"
            disabled={!canPayout}
            onClick={() => void submit()}
            className="rounded-2xl bg-pam-red px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {sending
              ? "Submitting…"
              : payoutAlreadyInitiated
                ? "Confirm OTP reminder"
                : "Confirm payout"}
          </button>
          {validatedName ? (
            <button
              type="button"
              onClick={resetValidation}
              className="w-full rounded-2xl border border-pam-border px-4 py-2 text-xs font-bold text-pam-muted"
            >
              Start over
            </button>
          ) : null}
        </AdminCard>

        <AdminCard className="p-0">
          {loading ? (
            <div className="p-4">
              <AdminSkeleton rows={4} />
            </div>
          ) : (
            <div className="divide-y divide-pam-border">
              {payouts.map((payout) => (
                <div key={payout.id} className="px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{payout.recipientName}</p>
                      <p className="text-xs text-pam-muted">
                        {payout.msisdn} · {payout.reference}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {formatPrice(payout.amount)}
                      </p>
                      <p className="text-[11px] font-bold uppercase text-pam-muted">
                        {payout.status}
                      </p>
                    </div>
                  </div>
                  {payout.statusMessage && (
                    <p className="mt-2 text-xs text-pam-muted">
                      {payout.statusMessage}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void refreshStatus(payout.reference)}
                    className="mt-2 text-xs font-bold text-pam-red"
                  >
                    Refresh status
                  </button>
                </div>
              ))}
              {!payouts.length && (
                <p className="px-5 py-10 text-center text-sm text-pam-muted">
                  No payouts yet.
                </p>
              )}
            </div>
          )}
        </AdminCard>
      </div>
    </AdminShell>
  );
}
