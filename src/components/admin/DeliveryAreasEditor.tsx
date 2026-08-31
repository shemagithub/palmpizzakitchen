"use client";

import { useMemo, useState } from "react";
import MoneyInput from "@/components/admin/MoneyInput";
import {
  KIGALI_DELIVERY_AREAS,
  type DeliveryAreaFee,
} from "@/lib/deliveryAreas";

function formatRwf(value: number) {
  return `${Math.round(value).toLocaleString("en-US")} RWF`;
}

type Props = {
  areas: DeliveryAreaFee[];
  defaultFee: number;
  onChange: (areas: DeliveryAreaFee[]) => void;
  onResetDefaults: () => void;
  onError?: (message: string) => void;
};

export default function DeliveryAreasEditor({
  areas,
  defaultFee,
  onChange,
  onResetDefaults,
  onError,
}: Props) {
  const [newAreaName, setNewAreaName] = useState("");
  const [filter, setFilter] = useState("");
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [bulkFee, setBulkFee] = useState("");

  const baseFee = Math.max(0, Math.round(Number(defaultFee) || 0));

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter((row) => row.area.toLowerCase().includes(q));
  }, [areas, filter]);

  const stats = useMemo(() => {
    const fees = areas.map((row) => row.fee).filter((fee) => fee >= 0);
    return {
      count: areas.length,
      min: fees.length ? Math.min(...fees) : baseFee,
      max: fees.length ? Math.max(...fees) : baseFee,
    };
  }, [areas, baseFee]);

  const suggestions = useMemo(() => {
    const existing = new Set(areas.map((row) => row.area.toLowerCase()));
    return KIGALI_DELIVERY_AREAS.filter(
      (name) => !existing.has(name.toLowerCase()),
    );
  }, [areas]);

  const report = (message: string) => {
    onError?.(message);
  };

  const addArea = (nameRaw: string, fee = baseFee) => {
    const name = nameRaw.trim().replace(/\s+/g, " ");
    if (!name) {
      report("Enter an area name.");
      return;
    }
    if (areas.some((row) => row.area.toLowerCase() === name.toLowerCase())) {
      report("That delivery area already exists.");
      return;
    }
    onChange([...areas, { area: name, fee: Math.max(0, Math.round(fee)) }]);
    setNewAreaName("");
  };

  const removeArea = (area: string) => {
    if (areas.length <= 1) {
      report("Keep at least one delivery area.");
      return;
    }
    onChange(areas.filter((row) => row.area !== area));
  };

  const updateFee = (area: string, fee: number) => {
    onChange(
      areas.map((row) =>
        row.area === area
          ? { ...row, fee: Math.max(0, Math.round(fee)) }
          : row,
      ),
    );
  };

  const startRename = (area: string) => {
    setEditingArea(area);
    setEditName(area);
  };

  const commitRename = (oldArea: string) => {
    const name = editName.trim().replace(/\s+/g, " ");
    setEditingArea(null);
    if (!name || name === oldArea) return;
    if (
      areas.some(
        (row) =>
          row.area !== oldArea && row.area.toLowerCase() === name.toLowerCase(),
      )
    ) {
      report("Another area already uses that name.");
      return;
    }
    onChange(
      areas.map((row) => (row.area === oldArea ? { ...row, area: name } : row)),
    );
  };

  const applyDefaultToAll = () => {
    onChange(areas.map((row) => ({ ...row, fee: baseFee })));
  };

  const applyBulkToFiltered = () => {
    const fee = Math.max(0, Math.round(Number(bulkFee) || 0));
    if (!fee && bulkFee !== "0") {
      report("Enter a fee to apply.");
      return;
    }
    const names = new Set(filtered.map((row) => row.area));
    onChange(
      areas.map((row) =>
        names.has(row.area) ? { ...row, fee } : row,
      ),
    );
    setBulkFee("");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-pam-border bg-white shadow-sm">
      <div className="border-b border-pam-border bg-pam-sand/30 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-[family-name:var(--font-oswald)] text-lg text-pam-ink">
              Delivery fee by area
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-pam-muted">
              Set a custom delivery price for each neighborhood. Customers pick
              their area at checkout — any whole RWF amount works (e.g. 1500,
              2000, or 2500).
            </p>
          </div>
          <button
            type="button"
            onClick={onResetDefaults}
            className="shrink-0 rounded-xl border border-pam-border bg-white px-3.5 py-2 text-xs font-bold text-pam-red transition hover:border-pam-red/30 hover:bg-pam-red/5"
          >
            Reset default list
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-lg">
          {[
            { label: "Areas", value: String(stats.count) },
            { label: "Lowest fee", value: formatRwf(stats.min) },
            { label: "Highest fee", value: formatRwf(stats.max) },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-pam-border/80 bg-white px-3 py-2.5"
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-pam-muted">
                {stat.label}
              </p>
              <p className="mt-0.5 text-sm font-bold text-pam-ink">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        <div className="rounded-xl border border-pam-border/80 bg-pam-sand/20 p-3 sm:p-4">
          <p className="text-xs font-bold text-pam-ink">Add a delivery area</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              className="input-field min-w-0 flex-1 rounded-xl text-sm"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addArea(newAreaName);
                }
              }}
              placeholder="e.g. Kabeza, Remera, Kimironko…"
            />
            <button
              type="button"
              onClick={() => addArea(newAreaName)}
              className="shrink-0 rounded-xl bg-pam-red px-5 py-2.5 text-sm font-bold text-white"
            >
              Add area
            </button>
          </div>

          {suggestions.length > 0 ? (
            <div className="mt-3">
              <p className="text-[11px] font-bold text-pam-muted">Quick add</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestions.slice(0, 10).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => addArea(name)}
                    className="rounded-full border border-pam-border bg-white px-2.5 py-1 text-[11px] font-bold text-pam-ink transition hover:border-pam-red/40 hover:text-pam-red"
                  >
                    + {name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label className="mb-1.5 block text-[11px] font-bold text-pam-muted uppercase">
              Search areas
            </label>
            <input
              className="input-field w-full rounded-xl py-2 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name…"
            />
          </div>
          <button
            type="button"
            onClick={applyDefaultToAll}
            className="rounded-xl border border-pam-border bg-white px-3.5 py-2.5 text-xs font-bold text-pam-ink transition hover:bg-pam-sand"
            title={`Set every area to ${formatRwf(baseFee)}`}
          >
            Set all → {baseFee.toLocaleString("en-US")} RWF
          </button>
        </div>

        {filter.trim() ? (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-pam-border bg-pam-sand/20 p-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 sm:max-w-[200px]">
              <label className="mb-1.5 block text-[11px] font-bold text-pam-muted uppercase">
                Apply fee to {filtered.length} shown
              </label>
              <MoneyInput
                value={bulkFee}
                onChange={(fee) => setBulkFee(String(fee))}
                placeholder={String(baseFee)}
                aria-label="Bulk fee for filtered areas"
              />
            </div>
            <button
              type="button"
              onClick={applyBulkToFiltered}
              className="shrink-0 rounded-xl bg-pam-ink px-4 py-2.5 text-xs font-bold text-white"
            >
              Apply to filtered
            </button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-pam-border">
          <div className="sticky top-0 z-[1] hidden border-b border-pam-border bg-pam-sand/80 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-pam-muted backdrop-blur-sm md:grid md:grid-cols-[minmax(0,1fr)_200px_148px] md:gap-4">
            <span>Area name</span>
            <span>Delivery fee</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="max-h-[min(24rem,55vh)] divide-y divide-pam-border overflow-y-auto bg-white">
            {filtered.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-pam-muted">
                No areas match your search.
              </p>
            ) : (
              filtered.map((row) => (
                <div
                  key={row.area}
                  className="px-4 py-3 md:grid md:grid-cols-[minmax(0,1fr)_200px_148px] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-pam-muted md:hidden">
                      Area
                    </p>
                    {editingArea === row.area ? (
                      <input
                        className="input-field w-full rounded-xl py-2 text-sm font-semibold"
                        value={editName}
                        autoFocus
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => commitRename(row.area)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(row.area);
                          if (e.key === "Escape") setEditingArea(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startRename(row.area)}
                        className="group flex w-full min-w-0 items-center gap-2 text-left"
                        title="Click to rename"
                      >
                        <span className="truncate text-sm font-bold text-pam-ink group-hover:text-pam-red">
                          {row.area}
                        </span>
                        <span className="shrink-0 rounded-md bg-pam-sand px-1.5 py-0.5 text-[10px] font-bold text-pam-muted opacity-0 transition group-hover:opacity-100">
                          Rename
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="mt-3 md:mt-0">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-pam-muted md:sr-only">
                      Delivery fee
                    </p>
                    <MoneyInput
                      value={row.fee}
                      onChange={(fee) => updateFee(row.area, fee)}
                      aria-label={`Delivery fee for ${row.area}`}
                    />
                    <p className="mt-1 text-[11px] text-pam-muted md:text-right">
                      {formatRwf(row.fee)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap justify-end gap-1.5 md:mt-0">
                    <button
                      type="button"
                      onClick={() => updateFee(row.area, baseFee)}
                      className="rounded-lg border border-pam-border bg-white px-2.5 py-2 text-[11px] font-bold text-pam-muted transition hover:border-pam-red/30 hover:text-pam-ink"
                      title={`Use default fee ${formatRwf(baseFee)}`}
                    >
                      Use default
                    </button>
                    <button
                      type="button"
                      onClick={() => removeArea(row.area)}
                      className="rounded-lg px-2.5 py-2 text-[11px] font-bold text-pam-red transition hover:bg-pam-red/8"
                      aria-label={`Remove ${row.area}`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <p className="text-xs leading-relaxed text-pam-muted">
          <strong className="text-pam-ink">Tips:</strong> click an area name to
          rename it. Filter areas to bulk-update fees. Press{" "}
          <strong>Save changes</strong> above when you are done.
        </p>
      </div>
    </div>
  );
}
