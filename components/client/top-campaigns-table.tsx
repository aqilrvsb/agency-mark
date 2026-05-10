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

export function TopCampaignsTable({ rows }: { rows: AggregateRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
        No campaigns yet. Once your accounts sync, top performers will rank here.
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold mb-0.5">
            Top campaigns
          </div>
          <div className="text-sm font-bold">Ranked by spend · {rows.length} campaign{rows.length === 1 ? "" : "s"}</div>
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
            {rows.map((r) => {
              const statusKey = (r.status ?? "").toUpperCase();
              const statusClass = STATUS_COLOR[statusKey] ?? "bg-white/5 text-[var(--color-text-muted)]";
              return (
                <tr key={r.key} className="border-b border-[var(--color-border)] last:border-0 hover:bg-white/[0.02]">
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
