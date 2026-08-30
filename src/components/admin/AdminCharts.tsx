"use client";

import { formatPrice } from "@/data/menu";

export type DayPoint = {
  date: string;
  label: string;
  fullLabel: string;
  orders: number;
  revenue: number;
};

export type StatusPoint = {
  status: string;
  count: number;
};

export type TopItem = {
  name: string;
  qty: number;
};

const STATUS_COLORS: Record<string, string> = {
  Pending: "#d4a017",
  Preparing: "#e31837",
  "Out for delivery": "#2563eb",
  Delivered: "#2f6b3a",
  Cancelled: "#8a8178",
};

function niceMax(value: number) {
  if (value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / exp) * exp;
}

export function RevenueAreaChart({ data }: { data: DayPoint[] }) {
  const width = 560;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 36, left: 12 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxRevenue = niceMax(Math.max(...data.map((d) => d.revenue), 0));
  const maxOrders = niceMax(Math.max(...data.map((d) => d.orders), 0));

  const x = (i: number) =>
    pad.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const yRev = (v: number) => pad.top + innerH - (v / maxRevenue) * innerH;
  const yOrd = (v: number) => pad.top + innerH - (v / maxOrders) * innerH;

  const area =
    data.length === 0
      ? ""
      : [
          `M ${x(0)} ${yRev(0)}`,
          ...data.map((d, i) => `L ${x(i)} ${yRev(d.revenue)}`),
          `L ${x(data.length - 1)} ${yRev(0)}`,
          "Z",
        ].join(" ");

  const line =
    data.length === 0
      ? ""
      : data
          .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${yRev(d.revenue)}`)
          .join(" ");

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Revenue over the last 7 days"
      >
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e31837" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#e31837" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={pad.left}
            x2={width - pad.right}
            y1={pad.top + innerH * (1 - t)}
            y2={pad.top + innerH * (1 - t)}
            stroke="#e8dfd4"
            strokeWidth="1"
          />
        ))}

        {area && <path d={area} fill="url(#revFill)" />}
        {line && (
          <path
            d={line}
            fill="none"
            stroke="#e31837"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {data.map((d, i) => (
          <g key={d.date}>
            <circle
              cx={x(i)}
              cy={yRev(d.revenue)}
              r="4"
              fill="#fff"
              stroke="#e31837"
              strokeWidth="2"
            />
            <circle
              cx={x(i)}
              cy={yOrd(d.orders)}
              r="3"
              fill="#c9a227"
              opacity="0.9"
            />
            <text
              x={x(i)}
              y={height - 12}
              textAnchor="middle"
              className="fill-[#8a8178]"
              style={{ fontSize: 11, fontWeight: 700 }}
            >
              {d.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-4 px-1 text-[11px] font-semibold text-pam-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-pam-red" /> Revenue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-pam-gold" /> Orders
        </span>
        <span className="ml-auto text-pam-ink">
          Peak {formatPrice(maxRevenue)}
        </span>
      </div>
    </div>
  );
}

export function StatusDonutChart({ data }: { data: StatusPoint[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const size = 180;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#efe6dc"
            strokeWidth={stroke}
          />
          {data.map((d) => {
            const len = (d.count / total) * c;
            const dash = `${len} ${c - len}`;
            const el = (
              <circle
                key={d.status}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={STATUS_COLORS[d.status] || "#8a8178"}
                strokeWidth={stroke}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-[family-name:var(--font-oswald)] text-3xl text-pam-ink">
            {data.reduce((s, d) => s + d.count, 0)}
          </p>
          <p className="text-[10px] font-bold tracking-wide text-pam-muted uppercase">
            Orders
          </p>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {data.map((d) => (
          <li
            key={d.status}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="inline-flex items-center gap-2 font-semibold text-pam-ink">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: STATUS_COLORS[d.status] || "#8a8178" }}
              />
              {d.status}
            </span>
            <span className="font-bold text-pam-muted">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TopItemsBarChart({ data }: { data: TopItem[] }) {
  const max = Math.max(...data.map((d) => d.qty), 1);

  if (!data.length) {
    return (
      <p className="py-8 text-center text-sm text-pam-muted">
        No sold items yet - charts fill as orders come in.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const pct = Math.max(6, (item.qty / max) * 100);
        return (
          <div key={item.name}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-bold text-pam-ink">
                {i + 1}. {item.name}
              </span>
              <span className="shrink-0 font-bold text-pam-muted">
                {item.qty} sold
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-pam-sand">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pam-red to-[#ff5a6e] transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OrdersBarChart({ data }: { data: DayPoint[] }) {
  const max = niceMax(Math.max(...data.map((d) => d.orders), 0));

  return (
    <div className="flex h-40 items-end gap-2 sm:gap-3">
      {data.map((d) => {
        const h = Math.max(4, (d.orders / max) * 100);
        return (
          <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="text-[10px] font-bold text-pam-muted">
              {d.orders || ""}
            </span>
            <div className="flex h-28 w-full items-end justify-center rounded-xl bg-pam-sand/50 px-1 pb-1">
              <div
                className="w-full max-w-[28px] rounded-lg bg-pam-ink transition-all duration-700"
                style={{ height: `${h}%` }}
                title={`${d.fullLabel}: ${d.orders} orders`}
              />
            </div>
            <span className="text-[10px] font-bold text-pam-muted">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
