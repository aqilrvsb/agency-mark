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
const PCT_HI = (n: number) => `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const DASH = "—";
const LINE_COLOR = "#2196F3";
const BAR_COLOR = "#1e88e5";

interface TikTokTemplateProps {
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
    conversionRate: number;
  } | null;
  daily: { date: string; spend: number; revenue: number }[];
  dailyImpressions: { date: string; value: number }[];
  rows: AggregateRow[];
  brandId?: string;
  adAccountOptions?: AdAccountOption[];
}

function levelLabels(level: "campaign" | "adset" | "ad") {
  if (level === "campaign") return { plural: "Campaigns", singular: "Campaign" };
  if (level === "ad") return { plural: "Ads", singular: "Ad" };
  return { plural: "Ad Groups", singular: "Ad Group" };
}

function shortMonthDay(iso: string): string {
  const d = new Date(iso);
  const m = d.toLocaleString("en-US", { month: "short" });
  return `${d.getDate()} ${m}`;
}

function MetricTrendCard({
  title,
  total,
  formatTotal,
  data,
}: {
  title: string;
  total: number;
  formatTotal: (n: number) => string;
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
      ? data.map((p, i) => ({
          x: padL + (i / (data.length - 1)) * innerW,
          y: padT + innerH - ((p.value - min) / range) * innerH,
          ...p,
        }))
      : [];

  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = min + (range * i) / yTicks;
    return { v, y: padT + innerH - (i / yTicks) * innerH };
  });
  const xTickIdx =
    data.length <= 1
      ? []
      : [0, Math.round((data.length - 1) / 3), Math.round((2 * (data.length - 1)) / 3), data.length - 1];
  const xLabels = xTickIdx
    .map((i, k, arr) => (k > 0 && i === arr[k - 1] ? null : i))
    .filter((i): i is number => i !== null)
    .map((i) => ({
      x: padL + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2),
      label: shortMonthDay(data[i].date),
    }));

  return (
    <div className="rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4 sm:p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="text-[15px] font-medium text-[var(--color-text-secondary)]">{title}</div>
        <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">{formatTotal(total)}</div>
      </div>
      {data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-xs text-[var(--color-text-muted)]">
          No data in this period.
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
          {yLabels.map((t, i) => (
            <g key={i}>
              <line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke="#262626" strokeWidth={1} />
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

function MetricBreakdownCard({
  title,
  total,
  formatTotal,
  rows,
}: {
  title: string;
  total: number;
  formatTotal: (n: number) => string;
  rows: { name: string; value: number }[];
}) {
  const top = rows.slice(0, 4);
  const max = Math.max(1, ...top.map((r) => r.value));

  return (
    <div className="rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4 sm:p-5 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="text-[15px] font-medium text-[var(--color-text-secondary)]">{title}</div>
        <div className="flex items-center gap-3">
          <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">{formatTotal(total)}</div>
          <button type="button" aria-label="More" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] leading-none -mt-1">
            •••
          </button>
        </div>
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
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: BAR_COLOR }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 sm:p-4 min-h-[90px] sm:min-h-[100px] flex flex-col">
      <div className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)] mb-2 truncate" title={label}>
        {label}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-lg sm:text-xl lg:text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">{value}</div>
      </div>
    </div>
  );
}

function DataTable({ level, rows }: { level: "campaign" | "adset" | "ad"; rows: AggregateRow[] }) {
  const headers: { key: string; label: string; align?: "left" | "right" }[] =
    level === "campaign"
      ? [
          { key: "name", label: "CAMPAIGN", align: "left" },
          { key: "reach", label: "REACH", align: "right" },
          { key: "results", label: "RESULTS", align: "right" },
          { key: "cpr", label: "COST PER RESULT", align: "right" },
          { key: "rrate", label: "RESULT RATE", align: "right" },
          { key: "purchasesApp", label: "PURCHASES (APP)", align: "right" },
          { key: "pvApp", label: "PURCHASE VALUE (APP)", align: "right" },
          { key: "proasApp", label: "PURCHASE ROAS (APP)", align: "right" },
        ]
      : level === "adset"
      ? [
          { key: "name", label: "AD GROUP", align: "left" },
          { key: "reach", label: "REACH", align: "right" },
          { key: "results", label: "RESULTS", align: "right" },
          { key: "cpr", label: "COST PER RESULT", align: "right" },
          { key: "rrate", label: "RESULT RATE", align: "right" },
          { key: "purchasesApp", label: "PURCHASES (APP)", align: "right" },
          { key: "pvApp", label: "PURCHASE VALUE", align: "right" },
          { key: "proasApp", label: "PURCHASE ROAS", align: "right" },
        ]
      : [
          { key: "ad", label: "AD", align: "left" },
          { key: "adtext", label: "AD TEXT", align: "left" },
          { key: "reach", label: "REACH", align: "right" },
          { key: "results", label: "RESULTS", align: "right" },
          { key: "cpr", label: "COST PER RESULT", align: "right" },
          { key: "rrate", label: "RESULT RATE", align: "right" },
          { key: "purchasesApp", label: "PURCHASES (APP)", align: "right" },
          { key: "pvApp", label: "PURCHASE VALUE", align: "right" },
        ];

  return (
    <div className="rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 flex-wrap px-4 sm:px-5 py-4 border-b border-[var(--color-border)]">
        <div className="text-[13px] text-[var(--color-text-muted)]">
          Showing {rows.length} of {rows.length} Rows
        </div>
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Search"
            className="h-8 w-full sm:w-44 rounded border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange-soft)] focus:border-[var(--color-orange)]"
          />
          <button type="button" aria-label="More" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] leading-none">
            •••
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
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
                    let cell: React.ReactNode = DASH;
                    const cls = h.align === "right" ? "text-right tabular-nums" : "text-left";
                    if (h.key === "name") cell = r.name;
                    else if (h.key === "ad") {
                      const thumb = r.creativeThumbnail;
                      cell = (
                        <div className="flex items-center gap-3">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt="" className="w-12 h-9 object-cover rounded shrink-0 bg-[var(--color-bg-soft)]" />
                          ) : (
                            <div className="w-12 h-9 rounded bg-[var(--color-bg-soft)] shrink-0" />
                          )}
                          <span className="truncate text-[var(--color-orange)] max-w-[200px]">{r.name}</span>
                        </div>
                      );
                    } else if (h.key === "adtext") {
                      cell = r.creativeBody ? (
                        <span className="truncate inline-block max-w-[200px] align-bottom">{r.creativeBody}</span>
                      ) : (
                        DASH
                      );
                    } else if (h.key === "reach") cell = r.reach > 0 ? NUM(r.reach) : DASH;
                    else if (h.key === "results") cell = NUM(r.conversions);
                    else if (h.key === "cpr") cell = r.conversions > 0 ? MYR(r.cpa) : DASH;
                    else if (h.key === "rrate") cell = r.clicks > 0 ? PCT(r.conversionRate) : DASH;
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

function TikTokIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-slate-700" aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

export function TikTokAATemplate(props: TikTokTemplateProps) {
  const { level, brandName, range, totals, dailyImpressions, rows, adAccountOptions = [] } = props;
  const labels = levelLabels(level);

  if (!totals || !range) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-6 flex items-center gap-2 text-[var(--color-text-secondary)]">
            <TikTokIcon />
            <h1 className="text-lg font-medium">{labels.plural}</h1>
          </header>
          <div className="rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] p-12 text-center text-sm text-[var(--color-text-muted)]">
            No brand assigned to this account yet.
          </div>
        </div>
      </div>
    );
  }

  const breakdownItems = rows.slice(0, 4).map((r) => ({ name: r.name, value: r.impressions }));

  // 67-tile KPI grid in 6-column rows. Most TikTok-specific metrics
  // (likes/comments/shares/quartile views/etc.) aren't in our sync yet;
  // those render as em-dash so the layout matches the screenshot but
  // the numbers don't lie.
  const valuePerPurchase = totals.conversions > 0 ? totals.revenue / totals.conversions : 0;
  const tiles: { label: string; value: string }[] = [
    { label: "Reach", value: totals.reach > 0 ? NUM(totals.reach) : DASH },
    { label: "Results", value: NUM(totals.conversions) },
    { label: "Cost per Result", value: totals.conversions > 0 ? MYR(totals.cpa) : DASH },
    { label: "Result Rate", value: totals.clicks > 0 ? PCT(totals.conversionRate) : DASH },
    { label: "Purchases (app)", value: DASH },
    { label: "Purchase Value (app)", value: DASH },

    { label: "Purchase ROAS (app)", value: DASH },
    { label: "Add to Cart (app)", value: DASH },
    { label: "Add to Cart Value (app)", value: DASH },
    { label: "Ads Impressions", value: NUM(totals.impressions) },
    { label: "Ads Impression Value", value: DASH },
    { label: "Ads Impression ROAS", value: DASH },

    { label: "Purchases (website)", value: DASH },
    { label: "Purchase Value (website)", value: totals.revenue > 0 ? MYR(totals.revenue) : DASH },
    { label: "Purchase ROAS (website)", value: totals.spend > 0 && totals.revenue > 0 ? PCT_HI(totals.roas * 100) : DASH },
    { label: "Value Per Purchase (web)", value: valuePerPurchase > 0 ? MYR(valuePerPurchase) : DASH },
    { label: "Add to Cart (website)", value: DASH },
    { label: "Add to Cart Value (web)", value: DASH },

    { label: "Purchases (TikTok)", value: DASH },
    { label: "Purchase Value (TikTok)", value: DASH },
    { label: "Purchase ROAS (TikTok)", value: DASH },
    { label: "Add to Cart (TikTok)", value: DASH },
    { label: "Add to Cart Value (TikTok)", value: DASH },
    { label: "Purchases (shop)", value: DASH },

    { label: "Gross Revenue (shop)", value: DASH },
    { label: "ROAS (shop)", value: DASH },
    { label: "Purchases (offline)", value: DASH },
    { label: "Purchase Value (offline)", value: DASH },
    { label: "Purchase ROAS (offline)", value: DASH },
    { label: "Add to Cart (offline)", value: DASH },

    { label: "Add to Cart Value (offline)", value: DASH },
    { label: "Checkouts Initiated (web)", value: DASH },
    { label: "Checkout Initiation Value", value: DASH },
    { label: "Paid 6-Second Focused", value: DASH },
    { label: "Paid 15-Second Focused", value: DASH },
    { label: "Content Views (app)", value: DASH },

    { label: "Content View Value (app)", value: DASH },
    { label: "Spend", value: MYR(totals.spend) },
    { label: "Clicks", value: NUM(totals.clicks) },
    { label: "Impressions", value: KSHORT(totals.impressions) },
    { label: "Likes", value: DASH },
    { label: "Comments", value: DASH },

    { label: "Shares", value: DASH },
    { label: "Follows", value: DASH },
    { label: "Profile Visits", value: DASH },
    { label: "CPC", value: totals.clicks > 0 ? MYR(totals.cpc) : DASH },
    { label: "CPM", value: totals.impressions > 0 ? MYR(totals.cpm) : DASH },
    { label: "CTR", value: totals.impressions > 0 ? PCT(totals.ctr) : DASH },

    { label: "Conversions", value: NUM(totals.conversions) },
    { label: "Cost per Conversion", value: totals.conversions > 0 ? MYR(totals.cpa) : DASH },
    { label: "Conversion Rate", value: totals.clicks > 0 ? PCT(totals.conversionRate) : DASH },
    { label: "Video Play Actions", value: totals.videoViews > 0 ? NUM(totals.videoViews) : DASH },
    { label: "Average Video Play", value: DASH },
    { label: "Quartile 1 Views", value: DASH },

    { label: "Quartile 2 Views", value: DASH },
    { label: "Quartile 3 Views", value: DASH },
    { label: "Full Views", value: DASH },
    { label: "2-Second Video Views", value: DASH },
    { label: "6-Second Video Views", value: DASH },
    { label: "6-Second Focused Views", value: DASH },

    { label: "15-Second Focused Views", value: DASH },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-5 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)] flex-wrap">
            <TikTokIcon />
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
          <MetricTrendCard
            title="Impressions"
            total={totals.impressions}
            formatTotal={KSHORT}
            data={dailyImpressions}
          />
          <MetricBreakdownCard
            title="Impressions"
            total={totals.impressions}
            formatTotal={KSHORT}
            rows={breakdownItems}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4">
          {tiles.map((t) => (
            <KpiTile key={t.label} label={t.label} value={t.value} />
          ))}
        </div>

        <DataTable level={level} rows={rows} />

        <p className="mt-4 text-[11px] text-[var(--color-text-muted)]">
          {dailyImpressions.length} days of data · {rows.length} {labels.plural.toLowerCase()} in window.
        </p>
      </div>
    </div>
  );
}
