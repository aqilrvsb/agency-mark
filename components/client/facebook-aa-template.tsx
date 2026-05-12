/**
 * Facebook / Meta Ads — client-portal "ultimate" reporting template.
 *
 * IA (top → bottom, per Stephen Few + Cole Knaflic):
 *   1. Context bar (icon + brand + range, plus filters in header)
 *   2. North-star strip — Hero ROAS card + 4 supporting KPI tiles
 *   3. Narrative card — "what changed" sentence
 *   4. Insight strip — auto-derived alerts/opportunities
 *   5. Trend chart — Spend vs Revenue dual-axis with break-even line
 *   6. Top contributors — campaigns ranked by spend, with ROAS chip
 *   7. Detail table — full level-down (campaigns/adsets/ads)
 *
 * Replaces the 13-tile AgencyAnalytics-style grid. Theme: dark canvas
 * with single yellow accent on the hero metric only.
 */

import type { AggregateRow } from "@/lib/client-data/aggregate";
import { DateRangePicker } from "./date-range-picker";
import { AdAccountFilter, type AdAccountOption } from "./ad-account-filter";
import {
  NUM,
  KSHORT,
  MYR,
  MYR_COMPACT,
  PCT,
  X,
  DASH,
  HeroMetricCard,
  KpiTile,
  Section,
  StatusPill,
  NarrativeCard,
  InsightStrip,
  DualAxisTrend,
  ContributionBars,
  deriveInsights,
  Sparkline,
} from "./ultimate";

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
    conversionRate: number;
    roas: number;
    frequency: number;
    videoViews: number;
  } | null;
  priorTotals?: {
    spend: number;
    revenue: number;
    impressions: number;
    clicks: number;
    conversions: number;
    cpa: number;
    roas: number;
    ctr: number;
    cpc: number;
    cpm: number;
    frequency: number;
  } | null;
  deltas?: {
    spend: number;
    revenue: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpa: number;
    roas: number;
    cpc: number;
    cpm: number;
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

function FbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
      <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82V14.706h-3.13v-3.62h3.13V8.41c0-3.1 1.894-4.788 4.659-4.788 1.325 0 2.464.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.762v2.31h3.587l-.467 3.62h-3.12V24h6.116c.732 0 1.325-.593 1.325-1.324V1.325C24 .593 23.407 0 22.675 0z" />
    </svg>
  );
}

function thumbOrFallback(src: string | null): string | null {
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
          { key: "name", label: "Campaign", align: "left" },
          { key: "spend", label: "Spend", align: "right" },
          { key: "revenue", label: "Revenue", align: "right" },
          { key: "roas", label: "ROAS", align: "right" },
          { key: "results", label: "Results", align: "right" },
          { key: "cpa", label: "Cost / Result", align: "right" },
          { key: "ctr", label: "CTR", align: "right" },
        ]
      : level === "adset"
      ? [
          { key: "name", label: "Ad Set", align: "left" },
          { key: "campaign", label: "Campaign", align: "left" },
          { key: "spend", label: "Spend", align: "right" },
          { key: "revenue", label: "Revenue", align: "right" },
          { key: "roas", label: "ROAS", align: "right" },
          { key: "cpa", label: "Cost / Result", align: "right" },
          { key: "ctr", label: "CTR", align: "right" },
        ]
      : [
          { key: "ad", label: "Ad", align: "left" },
          { key: "campaign", label: "Campaign", align: "left" },
          { key: "spend", label: "Spend", align: "right" },
          { key: "roas", label: "ROAS", align: "right" },
          { key: "cpa", label: "Cost / Result", align: "right" },
          { key: "ctr", label: "CTR", align: "right" },
        ];

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 flex-wrap px-4 sm:px-5 py-4 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-medium tracking-tight text-[var(--color-text-secondary)]">
          {rows.length} {rows.length === 1 ? levelLabels(level).singular.toLowerCase() : levelLabels(level).plural.toLowerCase()} in window
        </h3>
        <input
          type="search"
          placeholder="Search…"
          className="h-8 w-full sm:w-44 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange-soft)] focus:border-[var(--color-orange)]"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-white/[0.02]">
              {headers.map((h) => (
                <th
                  key={h.key}
                  className={`text-[10px] font-semibold tracking-[0.06em] text-[var(--color-text-muted)] uppercase px-4 py-3 ${
                    h.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-12 text-center text-[var(--color-text-muted)] text-sm"
                >
                  No data in this period.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.key} className="transition-colors hover:bg-white/[0.02]">
                  {headers.map((h) => {
                    let cell: React.ReactNode = "";
                    const cls = h.align === "right" ? "text-right tabular-nums" : "text-left";
                    if (h.key === "name") cell = r.name;
                    else if (h.key === "campaign") cell = r.campaignName ?? DASH;
                    else if (h.key === "ad") {
                      const thumb = thumbOrFallback(r.creativeThumbnail);
                      cell = (
                        <div className="flex items-center gap-3">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="w-12 h-9 object-cover rounded shrink-0 bg-[var(--color-bg-soft)]"
                            />
                          ) : (
                            <div className="w-12 h-9 rounded bg-[var(--color-bg-soft)] shrink-0" />
                          )}
                          <span className="truncate text-[var(--color-text-primary)] max-w-[260px]">
                            {r.creativeBody ?? r.name}
                          </span>
                        </div>
                      );
                    } else if (h.key === "spend") cell = MYR(r.spend);
                    else if (h.key === "revenue") cell = r.revenue > 0 ? MYR(r.revenue) : DASH;
                    else if (h.key === "roas")
                      cell = r.roas > 0 ? (
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {X(r.roas)}
                        </span>
                      ) : (
                        DASH
                      );
                    else if (h.key === "results") cell = NUM(r.conversions);
                    else if (h.key === "cpa") cell = r.conversions > 0 ? MYR(r.cpa) : DASH;
                    else if (h.key === "ctr") cell = r.impressions > 0 ? PCT(r.ctr) : DASH;
                    return (
                      <td
                        key={h.key}
                        className={`px-4 py-3.5 text-[var(--color-text-secondary)] ${cls}`}
                      >
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

export function FacebookAATemplate(props: FacebookTemplateProps) {
  const { level, brandName, range, totals, daily, rows, adAccountOptions = [] } = props;
  const labels = levelLabels(level);

  if (!totals || !range) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-6 flex items-center gap-2 text-[var(--color-text-secondary)]">
            <FbIcon />
            <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
              Facebook Ads · {labels.plural}
            </h1>
          </header>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center text-sm text-[var(--color-text-muted)]">
            No brand assigned to this account yet.
          </div>
        </div>
      </div>
    );
  }

  // Daily series for hero trend (spend + revenue together)
  const trendData = daily.map((d) => ({ date: d.date, primary: d.spend, secondary: d.revenue }));
  const dailySpendSpark = daily.map((d) => ({ value: d.spend }));
  const dailyClicksSpark = props.dailyClicks.map((d) => ({ value: d.value }));
  const dailyRevenueSpark = daily.map((d) => ({ value: d.revenue }));
  const dailyConvSpark: { value: number }[] = []; // not in series yet

  // Insights derived from totals/priorTotals/rows
  const insights =
    props.priorTotals && props.deltas
      ? deriveInsights({
          totals,
          priorTotals: {
            ...props.priorTotals,
            ctr: props.priorTotals.ctr,
            frequency: props.priorTotals.frequency ?? 0,
          },
          deltas: props.deltas,
          rows,
          daily,
          rangeDays: range.days,
        })
      : [];

  const topRow = rows.find((r) => r.spend > 0) ?? null;

  // Hero is ROAS if there's revenue, else Spend (so the empty-state still
  // looks like a real dashboard rather than an "RM 0" page)
  const hasRevenue = totals.revenue > 0;
  const heroLabel = hasRevenue ? "Return on Ad Spend" : "Total Spend";
  const heroValue = hasRevenue ? X(totals.roas) : MYR(totals.spend);
  const heroDelta = hasRevenue ? props.deltas?.roas : props.deltas?.spend;
  const heroCaption = hasRevenue
    ? `RM ${totals.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} earned on RM ${totals.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })} spent over ${range.days} days.`
    : `${range.days} days · ${rows.length} ${rows.length === 1 ? labels.singular.toLowerCase() : labels.plural.toLowerCase()} in window. Connect a conversion event to see ROAS.`;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header — context bar */}
        <header className="mb-6 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <FbIcon />
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--color-text-primary)] truncate">
              Facebook Ads · {labels.plural}
            </h1>
            {brandName && (
              <span className="hidden md:inline text-xs text-[var(--color-text-muted)] truncate">
                · {brandName} · {range.start} → {range.end}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <AdAccountFilter accounts={adAccountOptions} />
            <DateRangePicker />
          </div>
        </header>

        {/* North-star strip */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 sm:mb-6">
          <div className="lg:col-span-1">
            <HeroMetricCard
              label={heroLabel}
              value={heroValue}
              delta={heroDelta ?? null}
              invertDelta={false}
              caption={heroCaption}
              spark={hasRevenue ? dailyRevenueSpark : dailySpendSpark}
            />
          </div>
          <div className="lg:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
            <KpiTile
              label="Spend"
              value={MYR_COMPACT(totals.spend)}
              delta={props.deltas?.spend ?? null}
              invertDelta
              spark={dailySpendSpark}
            />
            <KpiTile
              label="Revenue"
              value={hasRevenue ? MYR_COMPACT(totals.revenue) : DASH}
              delta={props.deltas?.revenue ?? null}
              spark={hasRevenue ? dailyRevenueSpark : undefined}
            />
            <KpiTile
              label="Results"
              value={NUM(totals.conversions)}
              delta={props.deltas?.conversions ?? null}
              spark={dailyConvSpark.length ? dailyConvSpark : undefined}
            />
            <KpiTile
              label="Cost / Result"
              value={totals.conversions > 0 ? MYR(totals.cpa) : DASH}
              delta={props.deltas?.cpa ?? null}
              invertDelta
            />
            <KpiTile
              label="Clicks"
              value={NUM(totals.clicks)}
              delta={props.deltas?.clicks ?? null}
              spark={dailyClicksSpark}
            />
            <KpiTile
              label="CTR"
              value={totals.impressions > 0 ? PCT(totals.ctr) : DASH}
              delta={props.deltas?.ctr ?? null}
            />
            <KpiTile
              label="Impressions"
              value={KSHORT(totals.impressions)}
              delta={props.deltas?.impressions ?? null}
            />
            <KpiTile
              label="Avg CPM"
              value={totals.impressions > 0 ? MYR(totals.cpm) : DASH}
              delta={props.deltas?.cpm ?? null}
              invertDelta
            />
          </div>
        </div>

        {/* Narrative + Insights */}
        {props.priorTotals && props.deltas && (
          <Section className="mb-4 sm:mb-6">
            <NarrativeCard
              brandName={brandName}
              totals={totals}
              deltas={props.deltas}
              range={range}
              topRow={topRow}
            />
          </Section>
        )}

        {insights.length > 0 && (
          <Section title="What needs your attention" className="mb-4 sm:mb-6">
            <InsightStrip insights={insights} />
          </Section>
        )}

        {/* Trend */}
        <Section title="Spend vs Revenue trend" hint={`Daily series · ${range.days} days`} className="mb-4 sm:mb-6">
          <DualAxisTrend
            data={trendData}
            primaryLabel="Spend"
            secondaryLabel="Revenue"
            primaryFormat={(n) => MYR_COMPACT(n)}
            secondaryFormat={(n) => MYR_COMPACT(n)}
          />
        </Section>

        {/* Top contributors + Status snapshot */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 sm:mb-6">
          <ContributionBars
            title="Top contributors by spend"
            total={rows.reduce((s, r) => s + r.spend, 0)}
            formatValue={MYR_COMPACT}
            rows={rows
              .filter((r) => r.spend > 0)
              .slice(0, 5)
              .map((r) => ({
                name: r.name,
                value: r.spend,
                sub: r.roas > 0 ? `${X(r.roas)} ROAS · ${NUM(r.conversions)} results` : `${NUM(r.clicks)} clicks · ${NUM(r.conversions)} results`,
              }))}
          />
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 sm:p-5 lg:p-6 flex flex-col">
            <h3 className="text-sm font-medium tracking-tight text-[var(--color-text-secondary)] mb-4">
              Account snapshot
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-[var(--color-text-muted)]">Active {labels.plural.toLowerCase()}</dt>
              <dd className="text-right tabular-nums text-[var(--color-text-primary)]">
                {rows.filter((r) => (r.status ?? "").toLowerCase().includes("active") || (r.status ?? "").toLowerCase() === "enabled").length || rows.length}
              </dd>
              <dt className="text-[var(--color-text-muted)]">With spend</dt>
              <dd className="text-right tabular-nums text-[var(--color-text-primary)]">
                {rows.filter((r) => r.spend > 0).length}
              </dd>
              <dt className="text-[var(--color-text-muted)]">With conversions</dt>
              <dd className="text-right tabular-nums text-[var(--color-text-primary)]">
                {rows.filter((r) => r.conversions > 0).length}
              </dd>
              <dt className="text-[var(--color-text-muted)]">Frequency</dt>
              <dd className="text-right tabular-nums text-[var(--color-text-primary)]">
                {totals.frequency > 0 ? totals.frequency.toFixed(2) : DASH}
              </dd>
              <dt className="text-[var(--color-text-muted)]">Reach</dt>
              <dd className="text-right tabular-nums text-[var(--color-text-primary)]">
                {totals.reach > 0 ? KSHORT(totals.reach) : DASH}
              </dd>
              <dt className="text-[var(--color-text-muted)]">Avg CPC</dt>
              <dd className="text-right tabular-nums text-[var(--color-text-primary)]">
                {totals.clicks > 0 ? MYR(totals.cpc) : DASH}
              </dd>
            </dl>
            <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <StatusPill
                variant={totals.spend > 0 ? "positive" : "neutral"}
                label={totals.spend > 0 ? "Active" : "No spend"}
              />
              <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                {daily.length} day{daily.length === 1 ? "" : "s"} of data
              </span>
            </div>
            <div className="mt-3">
              <Sparkline data={dailySpendSpark} color="#d946ef" height={32} />
            </div>
          </div>
        </div>

        {/* Detail table */}
        <Section title={`All ${labels.plural.toLowerCase()}`} hint={`Sorted by spend · ${rows.length} row${rows.length === 1 ? "" : "s"}`}>
          <DataTable level={level} rows={rows} />
        </Section>

        <p className="text-[11px] text-[var(--color-text-muted)] mt-4 sm:mt-6">
          Data sourced from Meta Ads via official APIs · Last refreshed just now.
        </p>
      </div>
    </div>
  );
}
