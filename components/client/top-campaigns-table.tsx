"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { AggregateRow } from "@/lib/client-data/aggregate";

const fmtMyr = (n: number) =>
  `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-300",
  PAUSED: "bg-amber-500/15 text-amber-300",
  ARCHIVED: "bg-white/5 text-[var(--color-text-muted)]",
  REMOVED: "bg-white/5 text-[var(--color-text-muted)]",
  ENDED: "bg-white/5 text-[var(--color-text-muted)]",
};

type StatusFilter = "all" | "active" | "paused";
type SortKey = "spend" | "roas" | "conversions" | "ctr";

export function TopCampaignsTable({ rows, drillBase }: { rows: AggregateRow[]; drillBase?: string }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("spend");

  const filtered = useMemo(() => {
    let r = rows;
    if (statusFilter === "active") {
      r = r.filter((x) => (x.status ?? "").toUpperCase() === "ACTIVE");
    } else if (statusFilter === "paused") {
      r = r.filter((x) => (x.status ?? "").toUpperCase() === "PAUSED");
    }
    return [...r].sort((a, b) => {
      if (sortKey === "roas") return b.roas - a.roas;
      if (sortKey === "conversions") return b.conversions - a.conversions;
      if (sortKey === "ctr") return b.ctr - a.ctr;
      return b.spend - a.spend;
    });
  }, [rows, statusFilter, sortKey]);

  const counts = useMemo(() => {
    let active = 0, paused = 0, other = 0;
    for (const r of rows) {
      const s = (r.status ?? "").toUpperCase();
      if (s === "ACTIVE") active++;
      else if (s === "PAUSED") paused++;
      else other++;
    }
    return { all: rows.length, active, paused, other };
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
        No campaigns yet. Once your accounts sync, top performers will rank here.
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold mb-0.5">
            Top campaigns
          </div>
          <div className="text-sm font-bold">{filtered.length} of {rows.length} campaign{rows.length === 1 ? "" : "s"}</div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <FilterChip
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
            label={`All ${counts.all}`}
          />
          <FilterChip
            active={statusFilter === "active"}
            onClick={() => setStatusFilter("active")}
            label={`Active ${counts.active}`}
            color="emerald"
          />
          <FilterChip
            active={statusFilter === "paused"}
            onClick={() => setStatusFilter("paused")}
            label={`Paused ${counts.paused}`}
            color="amber"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-xs px-2 py-1 rounded-md bg-white/5 border border-[var(--color-border)] font-bold"
          >
            <option value="spend">Sort: Spend</option>
            <option value="roas">Sort: ROAS</option>
            <option value="conversions">Sort: Conv.</option>
            <option value="ctr">Sort: CTR</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left px-5 py-2.5 font-bold">Campaign</th>
              <th className="text-right px-3 py-2.5 font-bold">Spend</th>
              <th className="text-right px-3 py-2.5 font-bold">Conv.</th>
              <th className="text-right px-3 py-2.5 font-bold">CTR</th>
              <th className="text-right px-3 py-2.5 font-bold">CPA</th>
              <th className="text-right px-5 py-2.5 font-bold">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">
                  No campaigns match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const statusKey = (r.status ?? "").toUpperCase();
                const statusClass = STATUS_COLOR[statusKey] ?? "bg-white/5 text-[var(--color-text-muted)]";
                const drillHref = drillBase ? `${drillBase}/${encodeURIComponent(r.key)}` : null;
                return (
                  <tr
                    key={r.key}
                    className={`border-b border-[var(--color-border)] last:border-0 hover:bg-white/[0.02] ${
                      drillHref ? "cursor-pointer" : ""
                    }`}
                    onClick={drillHref ? () => router.push(drillHref) : undefined}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="font-bold truncate max-w-md" title={r.name}>
                          {r.name}
                        </div>
                        {r.status && (
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md ${statusClass}`}>
                            {r.status}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{fmtMyr(r.spend)}</td>
                    <td className="px-3 py-3 text-right font-mono">{r.conversions.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right font-mono">{r.ctr.toFixed(2)}%</td>
                    <td className="px-3 py-3 text-right font-mono">{r.conversions > 0 ? fmtMyr(r.cpa) : "—"}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold">
                      {r.roas > 0 ? <span className="text-emerald-400">{r.roas.toFixed(2)}×</span> : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: "emerald" | "amber";
}) {
  const activeColor =
    color === "emerald"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : color === "amber"
        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
        : "bg-[var(--color-orange)]/15 text-[var(--color-orange)] border-[var(--color-orange)]/30";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md font-bold border transition ${
        active ? activeColor : "bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );
}
