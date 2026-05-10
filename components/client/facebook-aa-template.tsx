import type { AggregateRow } from "@/lib/client-data/aggregate";
import { DateRangePicker } from "./date-range-picker";
import { AdAccountFilter, type AdAccountOption } from "./ad-account-filter";

const NUM = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const KSHORT = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)} M`
    : n >= 100_000
    ? `${(n / 1_000).toFixed(1)} K`
    : NUM(n);
const MYR = (n: number) =>
  `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PCT = (n: number) => `${n.toFixed(2)}%`;
const DASH = "—";

const DONUT_COLORS = ["#26a69a", "#42a5f5", "#1e88e5", "#66bb6a", "#7e57c2", "#ef6c00"];
const LINE_COLOR = "#2196F3";
const BAR_COLOR = "#1e88e5";

interface FacebookTemplateProps {
  level: "campaign" | "adset" | "ad";
  brandName?: string;
  range: { start: string; end: string; days: number } | null;
  totals: {
    spend: number;
    revenue: number;
    impressions: number;
    reach: number;
    clicks: number;
    ctr: number;
    cpc: number;
    cpm: number;
    conversions: number;
    cpa: number;
    roas: number;
    videoViews: number;
  } | null;
  daily: { date: string; spend: number; revenue: number }[];
  dailyClicks: { date: string; value: number }[];
  rows: AggregateRow[];
  brandId?: string;
  adAccountOptions?: AdAccountOption[];
  clicksByAccount?: { key: string; label: string; value: number }[];
}

function levelLabels(level: "campaign" | "adset" | "ad") {
  if (level === "campaign") return { plural: "Campaigns", singular: "Campaign" };
  if (level === "ad") return { plural: "Ads", singular: "Ad" };
  return { plural: "Ad Sets", singular: "Ad Set" };
}

function shortMonthDay(iso: string): string {
  const d = new Date(iso);
  const m = d.toLocaleString("en-US", { month: "short" });
  return `${d.getDate()} ${m}`;
}

function ClicksTrendCard({
  total,
  data,
}: {
  total: number;
  data: { date: string; value: number }[];
}) {
  const W = 600;
  const H = 220;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const max = Math.max(1, ...data.map((p) => p.value));
  const min = Math.min(0, ...data.map((p) => p.value));
  const range = Math.max(1, max - min);

  const points =
    data.length > 1
      ? data.map((p, i) => {
          const x = padL + (i / (data.length - 1)) * innerW;
          const y = padT + innerH - ((p.value - min) / range) * innerH;
          return { x, y, ...p };
        })
      : [];

  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = min + (range * i) / yTicks;
    const y = padT + innerH - (i / yTicks) * innerH;
    return { v, y };
  });

  const xTickIdx =
    data.length <= 1
      ? []
      : [0, Math.round((data.length - 1) / 3), Math.round((2 * (data.length - 1)) / 3), data.length - 1];
  const xLabels = xTickIdx
    .map((i, k, arr) => (k > 0 && i === arr[k - 1] ? null : i))
    .filter((i): i is number => i !== null)
    .map((i) => {
      const x = padL + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
      return { x, label: shortMonthDay(data[i].date) };
    });

  return (
    <div className="rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4 sm:p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="text-[15px] font-medium text-[var(--color-text-secondary)]">Clicks</div>
        <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">{NUM(total)}</div>
      </div>
      {data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-xs text-[var(--color-text-muted)]">
          No data in this period.
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
          {yLabels.map((t, i) => (
            <g key={i}>
              <line
                x1={padL}
                y1={t.y}
                x2={W - padR}
                y2={t.y}
                stroke="#262626"
                strokeWidth={1}
              />
              <text x={padL - 6} y={t.y + 4} fontSize="10" textAnchor="end" fill="#707070">
                {NUM(t.v)}
              </text>
            </g>
          ))}
          {xLabels.map((t, i) => (
            <text key={i} x={t.x} y={H - 8} fontSize="10" textAnchor="middle" fill="#707070">
              {t.label}
            </text>
          ))}
          {polyline && (
            <polyline
              points={polyline}
              fill="none"
              stroke={LINE_COLOR}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
        </svg>
      )}
    </div>
  );
}

function ClicksBreakdownCard({
  total,
  rows,
}: {
  total: number;
  rows: { name: string; value: number }[];
}) {
  const top = rows.slice(0, 4);
  const max = Math.max(1, ...top.map((r) => r.value));

  return (
    <div className="rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4 sm:p-5 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="text-[15px] font-medium text-[var(--color-text-secondary)]">Clicks</div>
        <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">{NUM(total)}</div>
      </div>
      {top.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[var(--color-text-muted)] py-12">
          No data in this period.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {top.map((r, i) => {
            const pct = (r.value / max) * 100;
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[13px] text-[var(--color-text-secondary)] truncate pr-3">{r.name}</div>
                  <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">{NUM(r.value)}</div>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: BAR_COLOR }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PublisherDonutCard({
  total,
  metricLabel,
  slices,
}: {
  total: number;
  metricLabel: string;
  slices: { key: string; label: string; value: number }[];
}) {
  const visible = slices.filter((s) => s.value > 0);
  const sum = visible.reduce((a, b) => a + b.value, 0);

  const cx = 90;
  const cy = 90;
  const r = 70;
  const innerR = 50;

  const arcs: { d: string; color: string; label: string; value: number; pct: number }[] = [];
  let acc = 0;
  visible.forEach((s, i) => {
    if (sum <= 0) return;
    const startAngle = (acc / sum) * Math.PI * 2 - Math.PI / 2;
    acc += s.value;
    const endAngle = (acc / sum) * Math.PI * 2 - Math.PI / 2;
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(startAngle);
    const y0 = cy + r * Math.sin(startAngle);
    const x1 = cx + r * Math.cos(endAngle);
    const y1 = cy + r * Math.sin(endAngle);
    const ix0 = cx + innerR * Math.cos(endAngle);
    const iy0 = cy + innerR * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(startAngle);
    const iy1 = cy + innerR * Math.sin(startAngle);
    const d = [
      `M ${x0.toFixed(2)} ${y0.toFixed(2)}`,
      `A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `L ${ix0.toFixed(2)} ${iy0.toFixed(2)}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)}`,
      "Z",
    ].join(" ");
    arcs.push({
      d,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      label: s.label,
      value: s.value,
      pct: (s.value / sum) * 100,
    });
  });

  return (
    <div className="rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4 sm:p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="text-[15px] font-medium text-[var(--color-text-secondary)]">Publisher Platforms</div>
        <button
          type="button"
          aria-label="More"
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] leading-none -mt-1"
        >
          •••
        </button>
      </div>
      {visible.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[var(--color-text-muted)] py-12">
          No data in this period.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="relative shrink-0">
            <svg viewBox="0 0 180 180" width="160" height="160">
              {arcs.map((a, i) => (
                <path key={i} d={a.d} fill={a.color} />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">{NUM(total)}</div>
              <div className="text-xs text-[var(--color-text-muted)]">{metricLabel}</div>
            </div>
          </div>
          <ul className="flex-1 w-full flex flex-col gap-2 text-[13px]">
            {arcs.map((a, i) => (
              <li key={i} className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: a.color }}
                />
                <span className="text-[var(--color-text-secondary)] truncate flex-1">{a.label}</span>
                <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">{NUM(a.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 sm:p-4 lg:p-5 min-h-[100px] sm:min-h-[110px] flex flex-col">
      <div className="text-[12px] sm:text-[13px] text-[var(--color-text-muted)] mb-2 truncate" title={label}>{label}</div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-xl sm:text-2xl lg:text-[28px] font-extrabold text-[var(--color-text-primary)] tracking-tight">
          {value}
        </div>
      </div>
    </div>
  );
}

function thumbOrFallback(src: string | null): string | null {
  if (!src) return null;
  return src;
}

function DataTable({
  level,
  rows,
}: {
  level: "campaign" | "adset" | "ad";
  rows: AggregateRow[];
}) {
  const headers: { key: string; label: string; align?: "left" | "right" }[] =
    level === "campaign"
      ? [
          { key: "name", label: "CAMPAIGN", align: "left" },
          { key: "clicks", label: "CLICKS", align: "right" },
          { key: "impressions", label: "IMPRESSIONS", align: "right" },
          { key: "reach", label: "REACH", align: "right" },
          { key: "spend", label: "AMOUNT SPENT", align: "right" },
          { key: "cpc", label: "AVERAGE CPC", align: "right" },
          { key: "cpm", label: "AVERAGE CPM", align: "right" },
          { key: "ctr", label: "CTR", align: "right" },
        ]
      : level === "adset"
      ? [
          { key: "campaign", label: "CAMPAIGN", align: "left" },
          { key: "name", label: "AD SET", align: "left" },
          { key: "clicks", label: "CLICKS", align: "right" },
          { key: "impressions", label: "IMPRESSIONS", align: "right" },
          { key: "reach", label: "REACH", align: "right" },
          { key: "spend", label: "AMOUNT SPENT", align: "right" },
          { key: "cpc", label: "AVERAGE CPC", align: "right" },
        ]
      : [
          { key: "campaign", label: "CAMPAIGN", align: "left" },
          { key: "ad", label: "AD", align: "left" },
          { key: "adset", label: "AD SET", align: "left" },
          { key: "clicks", label: "CLICKS", align: "right" },
          { key: "impressions", label: "IMPRESSIONS", align: "right" },
          { key: "reach", label: "REACH", align: "right" },
          { key: "spend", label: "AMOUNT SPENT", align: "right" },
        ];

  return (
    <div className="rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 flex-wrap px-4 sm:px-5 py-4 border-b border-[var(--color-border)]">
        <div className="text-[13px] text-[var(--color-text-muted)]">
          Showing {rows.length} of {rows.length} Rows
        </div>
        <div className="flex items-center">
          <input
            type="search"
            placeholder="Search"
            className="h-8 w-full sm:w-44 rounded border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange-soft)] focus:border-[var(--color-orange)]"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {headers.map((h) => (
                <th
                  key={h.key}
                  className={`text-[11px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase px-4 py-3 ${
                    h.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-12 text-center text-[var(--color-text-muted)] text-sm">
                  No data in this period.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.key} className={i > 0 ? "border-t border-[var(--color-border)]" : ""}>
                  {headers.map((h) => {
                    let cell: React.ReactNode = "";
                    let cls = h.align === "right" ? "text-right tabular-nums" : "text-left";
                    if (h.key === "name") cell = r.name;
                    else if (h.key === "campaign") cell = r.campaignName ?? DASH;
                    else if (h.key === "adset") cell = r.adsetName ?? DASH;
                    else if (h.key === "ad") {
                      const thumb = thumbOrFallback(r.creativeThumbnail);
                      cell = (
                        <div className="flex items-center gap-3">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt=""
                              className="w-12 h-9 object-cover rounded shrink-0 bg-[var(--color-bg-soft)]"
                            />
                          ) : (
                            <div className="w-12 h-9 rounded bg-[var(--color-bg-soft)] shrink-0" />
                          )}
                          <span className="truncate text-[var(--color-orange)] underline-offset-2 hover:underline max-w-[260px]">
                            {r.creativeBody ?? r.name}
                          </span>
                        </div>
                      );
                    } else if (h.key === "clicks") cell = NUM(r.clicks);
                    else if (h.key === "impressions") cell = NUM(r.impressions);
                    else if (h.key === "reach") cell = r.reach > 0 ? NUM(r.reach) : DASH;
                    else if (h.key === "spend") cell = MYR(r.spend);
                    else if (h.key === "cpc") cell = r.cpc > 0 ? MYR(r.cpc) : DASH;
                    else if (h.key === "cpm") cell = r.cpm > 0 ? MYR(r.cpm) : DASH;
                    else if (h.key === "ctr") cell = r.impressions > 0 ? PCT(r.ctr) : DASH;
                    return (
                      <td key={h.key} className={`px-4 py-3.5 text-[var(--color-text-secondary)] ${cls}`}>
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
      <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82V14.706h-3.13v-3.62h3.13V8.41c0-3.1 1.894-4.788 4.659-4.788 1.325 0 2.464.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.762v2.31h3.587l-.467 3.62h-3.12V24h6.116c.732 0 1.325-.593 1.325-1.324V1.325C24 .593 23.407 0 22.675 0z" />
    </svg>
  );
}

export function FacebookAATemplate(props: FacebookTemplateProps) {
  const {
    level,
    brandName,
    range,
    totals,
    daily,
    dailyClicks,
    rows,
    adAccountOptions = [],
    clicksByAccount = [],
  } = props;
  const labels = levelLabels(level);

  if (!totals || !range) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-6 flex items-center gap-2 text-[var(--color-text-secondary)]">
            <FbIcon />
            <h1 className="text-lg font-medium">{labels.plural}</h1>
          </header>
          <div className="rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] p-12 text-center text-sm text-[var(--color-text-muted)]">
            No brand assigned to this account yet.
          </div>
        </div>
      </div>
    );
  }

  const breakdownItems = rows.slice(0, 4).map((r) => ({ name: r.name, value: r.clicks }));

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-5 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)] flex-wrap">
            <FbIcon />
            <h1 className="text-lg font-medium text-[var(--color-text-primary)]">{labels.plural}</h1>
            {brandName && (
              <span className="text-sm text-[var(--color-text-muted)] ml-1 sm:ml-2 truncate max-w-[60vw]">
                · {brandName} · {range.start} → {range.end}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <AdAccountFilter accounts={adAccountOptions} />
            <DateRangePicker />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
          <ClicksTrendCard total={totals.clicks} data={dailyClicks} />
          <ClicksBreakdownCard total={totals.clicks} rows={breakdownItems} />
          <PublisherDonutCard
            total={totals.clicks}
            metricLabel="Clicks"
            slices={clicksByAccount}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-3 sm:mb-4">
          <KpiTile label="Clicks" value={NUM(totals.clicks)} />
          <KpiTile label="Impressions" value={NUM(totals.impressions)} />
          <KpiTile label="Reach" value={totals.reach > 0 ? KSHORT(totals.reach) : DASH} />
          <KpiTile label="Amount Spent" value={MYR(totals.spend)} />
          <KpiTile label="Average CPC" value={totals.clicks > 0 ? MYR(totals.cpc) : DASH} />

          <KpiTile label="Average CPM" value={totals.impressions > 0 ? MYR(totals.cpm) : DASH} />
          <KpiTile label="CTR" value={totals.impressions > 0 ? PCT(totals.ctr) : DASH} />
          <KpiTile label="Page Likes" value={DASH} />
          <KpiTile label="Post Reactions" value={DASH} />
          <KpiTile label="Cost Per Page Like" value={DASH} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-3 sm:mb-4">
          <KpiTile label="Cost Per Post Reaction" value={DASH} />
          <KpiTile label="Unique Link Clicks" value={DASH} />
          <KpiTile label="Unique CTR" value={DASH} />
        </div>

        <DataTable level={level} rows={rows} />

        <p className="mt-4 text-[11px] text-[var(--color-text-muted)]">
          {daily.length} days of data · {rows.length} {labels.plural.toLowerCase()} in window.
        </p>
      </div>
    </div>
  );
}
