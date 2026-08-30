"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import CustomerDetailModal from "@/components/admin/CustomerDetailModal";
import OrderDetailModal from "@/components/admin/OrderDetailModal";
import {
  AdminAlert,
  AdminCard,
  AdminHelpTip,
  AdminPageHeader,
  AdminSkeleton,
} from "@/components/admin/AdminUI";
import { formatPrice } from "@/data/menu";
import { api } from "@/lib/api";

type Customer = {
  id: string;
  userId?: number;
  source?: "account" | "checkout";
  hasAccount?: boolean;
  name: string;
  email: string;
  phone?: string;
  emailVerified?: boolean;
  orders: number;
  spent: number;
  joined: string;
  joinedAt?: string;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "account" | "checkout">(
    "all",
  );
  const [summary, setSummary] = useState({ accounts: 0, checkout: 0, total: 0 });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editOnOpen, setEditOnOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{
        customers: Customer[];
        summary?: { accounts: number; checkout: number; total: number };
      }>("/customers");
      setCustomers(data.customers);
      setSummary(
        data.summary || {
          accounts: data.customers.filter((c) => c.source !== "checkout").length,
          checkout: data.customers.filter((c) => c.source === "checkout").length,
          total: data.customers.length,
        },
      );
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = customers.filter((c) => {
    if (sourceFilter === "account" && c.source === "checkout") return false;
    if (sourceFilter === "checkout" && c.source !== "checkout") return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q)
    );
  });

  const deleteCustomer = async (customer: Customer) => {
    const isCheckout = customer.source === "checkout";
    const ok = window.confirm(
      isCheckout
        ? `Delete ${customer.name} from this list? This also removes their checkout orders from Orders.`
        : `Delete ${customer.name}'s shop account? Past orders stay in Orders, unlinked from this account.`,
    );
    if (!ok) return;
    setBusyId(customer.id);
    setError("");
    setNotice("");
    try {
      await api(`/customers/${encodeURIComponent(customer.id)}`, {
        method: "DELETE",
      });
      if (selectedCustomerId === customer.id) {
        setSelectedCustomerId(null);
        setEditOnOpen(false);
      }
      setNotice(
        isCheckout
          ? `${customer.name} and their checkout orders were removed.`
          : `${customer.name}'s account was deleted.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Daily work"
        title="Customers"
        subtitle="People who create an account on Account, plus anyone who ordered at checkout without signing up."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
          >
            Refresh list
          </button>
        }
      />

      <AdminHelpTip title="Tip" dismissKey="customers">
        Use <strong>Edit</strong> or <strong>Delete</strong> in Manage. Delete
        removes a shop account, or removes a checkout person and their guest
        orders.
      </AdminHelpTip>

      {error && <AdminAlert>{error}</AdminAlert>}
      {notice && <AdminAlert tone="ok">{notice}</AdminAlert>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, or phone…"
          className="input-field max-w-full rounded-2xl sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", `All (${summary.total})`],
              ["account", `Shop accounts (${summary.accounts})`],
              ["checkout", `Checkout only (${summary.checkout})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSourceFilter(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${
                sourceFilter === key
                  ? "bg-pam-red text-white ring-pam-red"
                  : "bg-white text-pam-ink ring-pam-border"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <AdminCard className="overflow-hidden">
        <div className="hidden border-b border-pam-border bg-pam-sand/40 px-5 py-3 text-[11px] font-bold tracking-wide text-pam-muted uppercase md:grid md:grid-cols-[1.15fr_1.1fr_0.5fr_0.6fr_0.6fr_1.15fr]">
          <span>Name</span>
          <span>Email</span>
          <span>Orders</span>
          <span>Spent</span>
          <span>Joined</span>
          <span>Manage</span>
        </div>
        {loading ? (
          <div className="p-4">
            <AdminSkeleton rows={4} />
          </div>
        ) : (
          <div className="divide-y divide-pam-border">
            {filtered.map((customer) => (
              <div
                key={customer.id}
                className="grid w-full gap-1.5 px-4 py-4 sm:px-5 md:grid-cols-[1.15fr_1.1fr_0.5fr_0.6fr_0.6fr_1.15fr] md:items-center"
              >
                <button
                  type="button"
                  onClick={() => {
                    setEditOnOpen(false);
                    setSelectedCustomerId(customer.id);
                  }}
                  className="text-left"
                >
                  <p className="text-sm font-bold text-pam-ink hover:text-pam-red">
                    {customer.name}
                  </p>
                  <p className="text-[11px] text-pam-muted">
                    {customer.phone || "No phone on account"} · Tap for details
                  </p>
                  <p className="mt-1">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        customer.source === "checkout"
                          ? "bg-pam-gold-soft text-pam-ink"
                          : customer.emailVerified
                            ? "bg-pam-basil/15 text-pam-basil"
                            : "bg-pam-sand text-pam-muted"
                      }`}
                    >
                      {customer.source === "checkout"
                        ? "Checkout only"
                        : customer.emailVerified
                          ? "Shop account"
                          : "Unverified account"}
                    </span>
                  </p>
                </button>
                <p className="truncate text-sm text-pam-muted">
                  {customer.email || "-"}
                </p>
                <p className="text-sm font-semibold">
                  <span className="text-pam-muted md:hidden">Orders · </span>
                  {customer.orders}
                </p>
                <p className="text-sm font-bold">
                  <span className="text-pam-muted md:hidden">Spent · </span>
                  {formatPrice(customer.spent)}
                </p>
                <p className="text-sm text-pam-muted">{customer.joined}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setEditOnOpen(true);
                      setSelectedCustomerId(customer.id);
                    }}
                    className="inline-flex min-h-9 min-w-[4.5rem] items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-bold text-pam-ink ring-1 ring-pam-border"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busyId === customer.id}
                    onClick={() => void deleteCustomer(customer)}
                    className="inline-flex min-h-9 min-w-[4.5rem] items-center justify-center rounded-xl bg-pam-red px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {busyId === customer.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
            {!filtered.length && (
              <p className="px-5 py-10 text-center text-sm text-pam-muted">
                No matching people. Shop accounts are created on{" "}
                <Link href="/account?mode=signup" className="font-bold text-pam-red">
                  Create account
                </Link>
                . Checkout customers appear after someone places an order.
              </p>
            )}
          </div>
        )}
      </AdminCard>

      <CustomerDetailModal
        customerId={selectedCustomerId}
        startInEdit={editOnOpen}
        onClose={() => {
          setSelectedCustomerId(null);
          setEditOnOpen(false);
        }}
        onUpdated={() => void load()}
        onOpenOrder={(orderId) => {
          setSelectedCustomerId(null);
          setEditOnOpen(false);
          setSelectedOrderId(orderId);
        }}
      />

      <OrderDetailModal
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onUpdated={() => void load()}
      />
    </AdminShell>
  );
}
