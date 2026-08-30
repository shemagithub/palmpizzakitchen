"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  OrdersBarChart,
  RevenueAreaChart,
  StatusDonutChart,
  TopItemsBarChart,
  type DayPoint,
  type StatusPoint,
  type TopItem,
} from "@/components/admin/AdminCharts";
import {
  AdminAlert,
  AdminCard,
  AdminHelpTip,
  AdminPageHeader,
  AdminSimpleActions,
  AdminSkeleton,
  StorefrontGrid,
} from "@/components/admin/AdminUI";
import { statusTone } from "@/data/admin";
import { formatPrice } from "@/data/menu";
import { api } from "@/lib/api";

type Stat = { label: string; value: string; change: string; tone: string };
type OrderRow = {
  id: string;
  customer: string;
  items: string;
  total: number;
  status: string;
};

type Charts = {
  revenueByDay: DayPoint[];
  ordersByStatus: StatusPoint[];
  topItems: TopItem[];
  weekSummary: { revenue: number; orders: number };
};

const EMPTY_CHARTS: Charts = {
  revenueByDay: [],
  ordersByStatus: [],
  topItems: [],
  weekSummary: { revenue: 0, orders: 0 },
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [charts, setCharts] = useState<Charts>(EMPTY_CHARTS);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, ordersData] = await Promise.all([
        api<{ stats: Stat[]; charts?: Charts }>("/stats"),
        api<{ orders: OrderRow[] }>("/orders"),
      ]);
      setStats(statsData.stats);
      setCharts(statsData.charts || EMPTY_CHARTS);
      setOrders(ordersData.orders.slice(0, 5));
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

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Start here"
        title="Welcome to your shop manager"
        subtitle="Use the big buttons below. You don’t need any technical knowledge - tap what you want to change, then press Save."
        actions={
          <>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-pam-ink ring-1 ring-pam-border"
            >
              Refresh numbers
            </button>
            <Link
              href="/admin/orders"
              className="rounded-xl bg-pam-red px-3.5 py-2.5 text-sm font-bold text-white"
            >
              Check orders
            </Link>
          </>
        }
      />

      <AdminHelpTip title="How this works" dismissKey="dashboard">
        1) Choose a section from the left menu · 2) Change the text or photos ·
        3) Press the red <strong>Save</strong> button · 4) Open{" "}
        <strong>View shop</strong> to see the customer website.
      </AdminHelpTip>

      <AdminSimpleActions
        items={[
          {
            href: "/admin/orders",
            title: "Check new orders",
            desc: "See what customers ordered and update the status.",
            tone: "red",
          },
          {
            href: "/admin/transactions",
            title: "See transactions",
            desc: "Money in from checkout and money out from payouts.",
            tone: "ink",
          },
          {
            href: "/admin/payouts",
            title: "Send a payout",
            desc: "Pay a MoMo number from the XentriPay wallet.",
          },
          {
            href: "/admin/menu",
            title: "Change food menu",
            desc: "Add pizzas or sides, change prices, or hide an item.",
            tone: "ink",
          },
          {
            href: "/admin/combos",
            title: "Edit meal combos",
            desc: "Manage family deals and combo packages.",
          },
          {
            href: "/admin/hero",
            title: "Change top banner",
            desc: "Update the big photos and headlines on the home page.",
          },
          {
            href: "/admin/categories",
            title: "Edit home categories",
            desc: "Add, delete, or change the round shortcuts (Pizzas, Drinks, Sides…) and their photos.",
          },
          {
            href: "/admin/home",
            title: "Edit home page text",
            desc: "Reviews, promo banner, features, and bottom call-to-action.",
          },
          {
            href: "/admin/about",
            title: "Edit About page",
            desc: "Tagline, features, kitchen story, photo, hours, and address.",
          },
          {
            href: "/admin/contact",
            title: "Contact messages",
            desc: "Read Name, Email, and Message from the website contact form.",
          },
          {
            href: "/admin/settings",
            title: "Shop settings",
            desc: "Business name, phone, address, delivery fee, and hours.",
          },
        ]}
      />

      {error && (
        <AdminAlert>
          {error}. Please sign in again from the Account page using your admin
          email and password.
        </AdminAlert>
      )}

      {loading ? (
        <AdminSkeleton rows={3} />
      ) : (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {stats.map((stat) => (
            <AdminCard key={stat.label} className="p-4 sm:p-5">
              <p className="text-[10px] font-semibold tracking-wide text-pam-muted uppercase sm:text-xs">
                {stat.label}
              </p>
              <p className="mt-2 font-[family-name:var(--font-oswald)] text-2xl text-pam-ink sm:text-3xl">
                {stat.value}
              </p>
              <p className={`mt-1 text-xs font-bold ${stat.tone}`}>{stat.change}</p>
            </AdminCard>
          ))}
        </div>
      )}

      {!loading && (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <AdminCard className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-[family-name:var(--font-oswald)] text-xl">
                  Sales this week
                </h2>
                <p className="text-xs text-pam-muted">
                  Money earned each day (RWF)
                </p>
              </div>
              <div className="text-right">
                <p className="font-[family-name:var(--font-oswald)] text-lg text-pam-ink">
                  {formatPrice(charts.weekSummary.revenue)}
                </p>
                <p className="text-[11px] font-bold text-pam-muted">
                  {charts.weekSummary.orders} orders this week
                </p>
              </div>
            </div>
            <RevenueAreaChart data={charts.revenueByDay} />
          </AdminCard>

          <AdminCard className="p-4 sm:p-5">
            <h2 className="mb-1 font-[family-name:var(--font-oswald)] text-xl">
              Orders by status
            </h2>
            <p className="mb-4 text-xs text-pam-muted">
              Preparing, on the way, delivered, and more
            </p>
            <StatusDonutChart data={charts.ordersByStatus} />
          </AdminCard>
        </div>
      )}

      {!loading && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <AdminCard className="p-4 sm:p-5">
            <h2 className="mb-1 font-[family-name:var(--font-oswald)] text-xl">
              Orders per day
            </h2>
            <p className="mb-4 text-xs text-pam-muted">Last 7 days</p>
            <OrdersBarChart data={charts.revenueByDay} />
          </AdminCard>

          <AdminCard className="p-4 sm:p-5">
            <h2 className="mb-1 font-[family-name:var(--font-oswald)] text-xl">
              Top sellers
            </h2>
            <p className="mb-4 text-xs text-pam-muted">
              Most ordered menu items
            </p>
            <TopItemsBarChart data={charts.topItems} />
          </AdminCard>
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_0.85fr] lg:gap-5">
        <AdminCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-pam-border px-4 py-3.5 sm:px-5">
            <h2 className="font-[family-name:var(--font-oswald)] text-lg sm:text-xl">
              Recent orders
            </h2>
            <Link href="/admin/orders" className="text-sm font-bold text-pam-red">
              See all →
            </Link>
          </div>
          <div className="divide-y divide-pam-border">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {order.id} · {order.customer}
                  </p>
                  <p className="truncate text-xs text-pam-muted">{order.items}</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold sm:text-[11px] ${statusTone(order.status)}`}
                  >
                    {order.status}
                  </span>
                  <p className="text-sm font-bold">{formatPrice(order.total)}</p>
                </div>
              </div>
            ))}
            {!orders.length && !error && !loading && (
              <p className="px-5 py-8 text-center text-sm text-pam-muted">
                No orders yet - place one from the storefront checkout.
              </p>
            )}
          </div>
        </AdminCard>

        <div className="space-y-4">
          <AdminCard className="overflow-hidden bg-gradient-to-br from-pam-red to-[#9a1024] p-4 text-white sm:p-5">
            <p className="text-[10px] font-bold tracking-[0.16em] text-white/75 uppercase">
              Client website
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-oswald)] text-2xl leading-tight">
              Open the customer website
            </h3>
            <p className="mt-2 text-sm text-white/80">
              Preview what shoppers see - menu, offers, cart, and checkout.
            </p>
            <Link
              href="/admin/website"
              className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-pam-ink"
            >
              Website shortcuts
            </Link>
          </AdminCard>

          <AdminCard className="p-4 sm:p-5">
            <h3 className="font-[family-name:var(--font-oswald)] text-lg">
              Go to a shop page
            </h3>
            <div className="mt-3">
              <StorefrontGrid compact />
            </div>
          </AdminCard>
        </div>
      </div>
    </AdminShell>
  );
}
