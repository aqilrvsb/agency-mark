import type { AggregateRow } from "@/lib/client-data/aggregate";

const fmtMyr = (n: number) =>
  `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtInt = (n: number) => n.toLocaleString();
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

export function MetricsTable({
  rows,
  nameLabel,
  emptyMessage,
}: {
  rows: AggregateRow[];
  nameLabel: string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--color-text-muted)] text-sm">
        {emptyMessage ?? "No data yet. Once your accounts are connected and synced, performance will appear here."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
          <tr>
            <th className="text-left py-3 font-bold">{nameLabel}</th>
            <th className="text-right py-3 font-bold">Spend</th>
            <th className="text-right py-3 font-bold">Impressions</th>
            <th className="text-right py-3 font-bold">Clicks</th>
            <th className="text-right py-3 font-bold">CTR</th>
            <th className="text-right py-3 font-bold">CPC</th>
            <th className="text-right py-3 font-bold">Conv.</th>
            <th className="text-right py-3 font-bold">CPA</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-soft)]/40">
              <td className="py-3">
                <div className="font-bold truncate max-w-xs" title={r.name}>{r.name}</div>
                {r.objective && (
                  <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">{r.objective}</div>
                )}
              </td>
              <td className="py-3 text-right font-mono">{fmtMyr(r.spend)}</td>
              <td className="py-3 text-right font-mono">{fmtInt(r.impressions)}</td>
              <td className="py-3 text-right font-mono">{fmtInt(r.clicks)}</td>
              <td className="py-3 text-right font-mono">{fmtPct(r.ctr)}</td>
              <td className="py-3 text-right font-mono">{r.clicks > 0 ? fmtMyr(r.cpc) : "—"}</td>
              <td className="py-3 text-right font-mono">{fmtInt(r.conversions)}</td>
              <td className="py-3 text-right font-mono">{r.conversions > 0 ? fmtMyr(r.cpa) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MetricsSummary({
  spend,
  impressions,
  clicks,
  ctr,
  conversions,
  cpa,
}: {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <Stat label="Spend" value={fmtMyr(spend)} accent="text-[var(--color-orange)]" />
      <Stat label="Impressions" value={fmtInt(impressions)} accent="text-cyan-400" />
      <Stat label="CTR" value={fmtPct(ctr)} accent="text-[var(--color-amber)]" />
      <Stat label="CPA" value={conversions > 0 ? fmtMyr(cpa) : "—"} accent="text-[var(--color-lime)]" />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-4">
      <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-1.5">{label}</div>
      <div className={`font-display font-extrabold text-2xl ${accent}`}>{value}</div>
    </div>
  );
}
