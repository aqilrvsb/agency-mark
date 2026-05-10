import type { DailyPoint } from "@/lib/client-data/overview-data";
import { EmptyState } from "./empty-state";
import { LineChart } from "lucide-react";

interface ChartAnnotation {
  id: string;
  anchor_date: string;
  body: string;
}

// SVG-based dual-axis chart. Server-renderable. No deps.
export function DualAxisChart({
  current,
  prior,
  annotations = [],
  height = 200,
}: {
  current: DailyPoint[];
  prior: DailyPoint[];
  annotations?: ChartAnnotation[];
  height?: number;
}) {
  if (current.length === 0) {
    return (
      <div className="mb-6">
        <EmptyState
          icon={<LineChart className="w-5 h-5 text-[var(--color-text-muted)]" />}
          title="No spend recorded in this period yet"
          description="Once your ad accounts are connected and synced, the daily spend & revenue trend will appear here. Sync runs every hour."
          actionHref="/client/connections"
          actionLabel="Connect ad accounts"
          compact
        />
      </div>
    );
  }

  const maxSpend = Math.max(1, ...current.map((d) => d.spend), ...prior.map((d) => d.spend));
  const maxRevenue = Math.max(1, ...current.map((d) => d.revenue), ...prior.map((d) => d.revenue));

  const width = 1000;
  const padding = { top: 20, right: 50, bottom: 30, left: 50 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const xStep = current.length > 1 ? innerW / (current.length - 1) : 0;

  const buildPath = (data: DailyPoint[], key: "spend" | "revenue", scale: number, baseSeriesLength: number) => {
    if (data.length === 0) return "";
    const step = baseSeriesLength > 1 ? innerW / (baseSeriesLength - 1) : 0;
    return data
      .map((d, i) => {
        const x = padding.left + i * step;
        const y = padding.top + innerH - (d[key] / scale) * innerH;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const spendPath = buildPath(current, "spend", maxSpend, current.length);
  const revenuePath = buildPath(current, "revenue", maxRevenue, current.length);
  // Map prior series onto same x-axis as current (length-aligned)
  const priorAligned = current.map((_, i) => prior[i] ?? { date: "", spend: 0, revenue: 0 });
  const priorSpendPath = buildPath(priorAligned, "spend", maxSpend, current.length);

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => (maxSpend * i) / yTicks);

  return (
    <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold mb-0.5">
            Daily trend
          </div>
          <div className="text-sm font-bold">Spend &amp; revenue</div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[var(--color-orange)]" />
            <span className="text-[var(--color-text-secondary)]">Spend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400" />
            <span className="text-[var(--color-text-secondary)]">Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-[var(--color-text-muted)]" />
            <span className="text-[var(--color-text-secondary)]">Prev period</span>
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        {/* Y grid */}
        {tickValues.map((v, i) => {
          const y = padding.top + innerH - (v / maxSpend) * innerH;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + innerW}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeDasharray="2 4"
              />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.5">
                {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Prior spend dotted */}
        {prior.length > 0 && (
          <path d={priorSpendPath} fill="none" stroke="var(--color-orange)" strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="3 3" />
        )}
        {/* Current spend solid */}
        <path d={spendPath} fill="none" stroke="var(--color-orange)" strokeWidth="2" />
        {/* Revenue solid */}
        <path d={revenuePath} fill="none" stroke="rgb(52 211 153)" strokeWidth="2" />

        {/* X labels (sparse) */}
        {current.map((d, i) => {
          if (current.length > 14 && i % Math.ceil(current.length / 7) !== 0 && i !== current.length - 1) return null;
          const x = padding.left + i * xStep;
          return (
            <text key={d.date + i} x={x} y={height - 8} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.5">
              {d.date.slice(5)}
            </text>
          );
        })}

        {/* Annotation pins — vertical line + small marker, hover shows body via title */}
        {annotations.map((a) => {
          const idx = current.findIndex((d) => d.date === a.anchor_date);
          if (idx < 0) return null;
          const x = padding.left + idx * xStep;
          return (
            <g key={a.id}>
              <title>{`${a.anchor_date}: ${a.body}`}</title>
              <line
                x1={x}
                x2={x}
                y1={padding.top}
                y2={padding.top + innerH}
                stroke="var(--color-orange)"
                strokeOpacity="0.4"
                strokeWidth="1"
                strokeDasharray="2 3"
              />
              <circle
                cx={x}
                cy={padding.top + 6}
                r="4"
                fill="var(--color-orange)"
                stroke="var(--color-bg)"
                strokeWidth="1.5"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
