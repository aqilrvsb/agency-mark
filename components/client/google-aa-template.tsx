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

const LINE_COLOR = "#2196F3";
const BAR_PALETTE = ["#42a5f5", "#66bb6a", "#ff9800", "#90caf9", "#ab47bc", "#26a69a"];

interface GoogleTemplateProps {
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
    conversionRate: number;
  } | null;
  daily: { date: string; spend: number; revenue: number }[];
  dailyClicks: { date: string; value: number }[];
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

function ClicksTrendCard({
  total,
  data,
}: {
  total: number;
  data: { date: string; value: number }[];
}) {
  const W = 600;
  const H = 280;
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
    <div className="rounded-lg bg-white border border-slate-200 p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="text-[15px] font-medium text-slate-700">Clicks</div>
        <div className="text-[15px] font-semibold text-slate-700">{NUM(total)}</div>
      </div>
      {data.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-xs text-slate-400">
          No data in this period.
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
          {yLabels.map((t, i) => (
            <g key={i}>
              <line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={padL - 6} y={t.y + 4} fontSize="10" textAnchor="end" fill="#94a3b8">
                {NUM(t.v)}
              </text>
            </g>
          ))}
          {xLabels.map((t, i) => (
            <text key={i} x={t.x} y={H - 8} fontSize="10" textAnchor="middle" fill="#94a3b8">
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

function VerticalBarBreakdownCard({
  total,
  rows,
}: {
  total: number;
  rows: { name: string; value: number }[];
}) {
  const top = rows.slice(0, 4);
  const max = Math.max(1, ...top.map((r) => r.value));

  const W = 600;
  const H = 280;
  const padL = 40;
  const padR = 16;
  const padT = 24;
  const padB = 56;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const barCount = top.length || 1;
  const slot = innerW / barCount;
  const barW = Math.min(60, slot * 0.55);

  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = (max * i) / yTicks;
    return { v, y: padT + innerH - (i / yTicks) * innerH };
  });

  return (
    <div className="rounded-lg bg-white border border-slate-200 p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="text-[15px] font-medium text-slate-700">Clicks</div>
        <div className="flex items-center gap-3">
          <div className="text-[15px] font-semibold text-slate-700">{NUM(total)}</div>
          <button type="button" aria-label="More" className="text-slate-400 hover:text-slate-600 leading-none -mt-1">
            •••
          </button>
        </div>
      </div>
      {top.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-xs text-slate-400">
          No data in this period.
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
          {yLabels.map((t, i) => (
            <g key={i}>
              <line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={padL - 6} y={t.y + 4} fontSize="10" textAnchor="end" fill="#94a3b8">
                {NUM(t.v)}
              </text>
            </g>
          ))}
          {top.map((r, i) => {
            const cx = padL + slot * (i + 0.5);
            const h = (r.value / max) * innerH;
            const y = padT + innerH - h;
            const color = BAR_PALETTE[i % BAR_PALETTE.length];
            return (
              <g key={i}>
                <rect
                  x={cx - barW / 2}
                  y={y}
                  width={barW}
                  height={h}
                  fill={color}
                  rx={2}
                />
                <text x={cx} y={H - 18} fontSize="11" textAnchor="middle" fill="#475569">
                  {truncate(r.name, 14)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

function TopUrlsBreakdownCard({
  total,
  totalLabel,
  title,
  rows,
}: {
  total: number;
  totalLabel?: string;
  title: string;
  rows: { name: string; value: number }[];
}) {
  const top = rows.slice(0, 4);
  const max = Math.max(1, ...top.map((r) => r.value));

  return (
    <div className="rounded-lg bg-white border border-slate-200 p-5 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="text-[15px] font-medium text-slate-700">{title}</div>
        <div className="flex items-center gap-3">
          <div className="text-[15px] font-semibold text-slate-700">
            {totalLabel ?? NUM(total)}
          </div>
          <button type="button" aria-label="More" className="text-slate-400 hover:text-slate-600 leading-none -mt-1">
            •••
          </button>
        </div>
      </div>
      {top.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-12">
          No data in this period.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {top.map((r, i) => {
            const pct = (r.value / max) * 100;
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[13px] text-slate-700 truncate pr-3">{r.name}</div>
                  <div className="text-[13px] font-semibold text-slate-700">{NUM(r.value)}</div>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: LINE_COLOR }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white border border-slate-200 p-4 lg:p-5 min-h-[110px] flex flex-col">
      <div className="text-[13px] text-slate-500 mb-2">{label}</div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-2xl lg:text-[28px] font-extrabold text-slate-900 tracking-tight">{value}</div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const norm = (status ?? "").toLowerCase();
  const isActive =
    norm === "active" || norm === "enabled" || norm === "running" || norm === "live";
  const isPaused = norm.includes("paus") || norm === "stopped" || norm === "disabled";
  if (!norm) {
    return <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-slate-400">—</span>;
  }
  return (
    <span
      className={
        isActive
          ? "inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-white bg-emerald-500"
          : isPaused
          ? "inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-white bg-blue-500"
          : "inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-white bg-slate-400"
      }
    >
      {(isActive ? "ENABLED" : isPaused ? "PAUSED" : "—").toUpperCase()}
    </span>
  );
}

function NetworkPill({ network }: { network: string | null }) {
  if (!network) {
    return (
      <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-white bg-blue-500">
        SEARCH NETW…
      </span>
    );
  }
  return (
    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-white bg-blue-500">
      {network.toUpperCase()}
    </span>
  );
}

function DataTable({ level, rows }: { level: "campaign" | "adset" | "ad"; rows: AggregateRow[] }) {
  const headers: { key: string; label: string; align?: "left" | "right" }[] =
    level === "campaign"
      ? [
          { key: "name", label: "CAMPAIGN", align: "left" },
          { key: "impr_share", label: "SEARCH IMPR. S…", align: "right" },
          { key: "status", label: "STATUS", align: "left" },
          { key: "network", label: "NETWORK", align: "left" },
          { key: "vtc", label: "VIEW-THROUGH …", align: "right" },
          { key: "cpc", label: "AVG CPC", align: "right" },
          { key: "clicks", label: "CLICKS", align: "right" },
          { key: "convrate", label: "CONVERSION R…", align: "right" },
        ]
      : level === "adset"
      ? [
          { key: "name", label: "AD GROUP", align: "left" },
          { key: "campaign", label: "CAMPAIGN", align: "left" },
          { key: "impr_share", label: "SEARCH IMPR. S…", align: "right" },
          { key: "status", label: "STATUS", align: "left" },
          { key: "network", label: "NETWORK", align: "left" },
          { key: "vtc", label: "VIEW-THROUGH …", align: "right" },
          { key: "cpc", label: "AVG CPC", align: "right" },
        ]
      : [
          { key: "ad", label: "AD", align: "left" },
          { key: "adset", label: "AD GROUP", align: "left" },
          { key: "campaign", label: "CAMPAIGN", align: "left" },
          { key: "url", label: "FINAL URL", align: "left" },
          { key: "status", label: "STATUS", align: "left" },
          { key: "network", label: "NETWORK", align: "left" },
          { key: "vtc", label: "VIEW-THROUG…", align: "right" },
        ];

  return (
    <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <div className="text-[13px] text-slate-500">
          Showing {rows.length} of {rows.length} Rows
        </div>
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Search"
            className="h-8 w-44 rounded border border-slate-300 px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          />
          <button type="button" aria-label="More" className="text-slate-400 hover:text-slate-600 leading-none">
            •••
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200">
              {headers.map((h) => (
                <th
                  key={h.key}
                  className={`text-[11px] font-semibold tracking-wider text-slate-500 uppercase px-4 py-3 ${
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
                <td colSpan={headers.length} className="px-4 py-12 text-center text-slate-400 text-sm">
                  No data in this period.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.key} className={i > 0 ? "border-t border-slate-100" : ""}>
                  {headers.map((h) => {
                    let cell: React.ReactNode = DASH;
                    const cls = h.align === "right" ? "text-right tabular-nums" : "text-left";
                    if (h.key === "name") cell = r.name;
                    else if (h.key === "campaign") cell = r.campaignName ?? DASH;
                    else if (h.key === "adset") cell = r.adsetName ?? DASH;
                    else if (h.key === "ad") {
                      const thumb = r.creativeThumbnail;
                      cell = (
                        <div className="flex items-start gap-3">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt="" className="w-12 h-9 object-cover rounded shrink-0 bg-slate-100" />
                          ) : (
                            <div className="w-12 h-9 rounded bg-slate-100 shrink-0" />
                          )}
                          <div className="flex flex-col leading-tight">
                            <span className="text-blue-600 underline-offset-2 hover:underline truncate max-w-[180px]">
                              {r.name}
                            </span>
                            {r.creativeBody && (
                              <span className="text-[11px] text-slate-500 truncate max-w-[180px]">
                                {r.creativeBody}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    } else if (h.key === "url") cell = DASH;
                    else if (h.key === "status") cell = <StatusPill status={r.status} />;
                    else if (h.key === "network") cell = <NetworkPill network={null} />;
                    else if (h.key === "vtc") cell = DASH;
                    else if (h.key === "impr_share") cell = DASH;
                    else if (h.key === "cpc") cell = r.clicks > 0 ? MYR(r.cpc) : DASH;
                    else if (h.key === "clicks") cell = NUM(r.clicks);
                    else if (h.key === "convrate") cell = r.clicks > 0 ? PCT(r.conversionRate) : DASH;
                    return (
                      <td key={h.key} className={`px-4 py-3.5 text-slate-700 ${cls}`}>
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

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC04" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function GoogleAATemplate(props: GoogleTemplateProps) {
  const { level, brandName, range, totals, dailyClicks, rows, adAccountOptions = [] } = props;
  const labels = levelLabels(level);

  if (!totals || !range) {
    return (
      <div className="bg-slate-50 min-h-screen p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-6 flex items-center gap-2 text-slate-700">
            <GoogleIcon />
            <h1 className="text-lg font-medium">{labels.plural}</h1>
          </header>
          <div className="rounded-lg bg-white border border-slate-200 p-12 text-center text-sm text-slate-500">
            No brand assigned to this account yet.
          </div>
        </div>
      </div>
    );
  }

  const breakdownItems = rows.slice(0, 4).map((r) => ({ name: r.name, value: r.clicks }));
  const breakdownTotal = breakdownItems.reduce((s, r) => s + r.value, 0);

  const tiles: { label: string; value: string }[] = [
    { label: "Search Impr. Share", value: DASH },
    { label: "View-Through Conv.", value: DASH },
    { label: "Avg CPC", value: totals.clicks > 0 ? MYR(totals.cpc) : DASH },
    { label: "Clicks", value: NUM(totals.clicks) },
    {
      label: "Conversion Rate",
      value: totals.clicks > 0 ? PCT(totals.conversionRate) : DASH,
    },

    { label: "Conversions", value: NUM(totals.conversions) },
    { label: "Cost", value: MYR(totals.spend) },
    {
      label: "Cost / Conversion",
      value: totals.conversions > 0 ? MYR(totals.cpa) : DASH,
    },
    { label: "CTR", value: totals.impressions > 0 ? PCT(totals.ctr) : DASH },
    { label: "Impressions", value: KSHORT(totals.impressions) },
  ];

  return (
    <div className="bg-slate-50 min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-slate-700">
            <GoogleIcon />
            <h1 className="text-lg font-medium">{labels.plural}</h1>
            {brandName && (
              <span className="text-sm text-slate-400 ml-2">
                · {brandName} · {range.start} → {range.end}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="[&_button]:bg-white [&_button]:text-slate-700 [&_button]:border-slate-300 [&_button]:hover:bg-slate-50 [&_a]:bg-white [&_a]:text-slate-700 [&_a]:border-slate-300">
              <AdAccountFilter accounts={adAccountOptions} />
            </div>
            <div className="[&_input]:bg-white [&_input]:text-slate-700 [&_input]:border-slate-300 [&_button]:bg-white [&_button]:text-slate-700 [&_button]:border-slate-300 [&_a]:bg-white [&_a]:text-slate-700 [&_a]:border-slate-300">
              <DateRangePicker />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <ClicksTrendCard total={totals.clicks} data={dailyClicks} />
          {level === "ad" ? (
            <TopUrlsBreakdownCard
              title="Top Destination Urls"
              total={breakdownTotal}
              rows={breakdownItems}
            />
          ) : (
            <VerticalBarBreakdownCard total={breakdownTotal} rows={breakdownItems} />
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
          {tiles.map((t) => (
            <KpiTile key={t.label} label={t.label} value={t.value} />
          ))}
        </div>

        <DataTable level={level} rows={rows} />

        <p className="mt-4 text-[11px] text-slate-400">
          {dailyClicks.length} days of data · {rows.length} {labels.plural.toLowerCase()} in window.
        </p>
      </div>
    </div>
  );
}
