/**
 * TikTok Ads — client-portal "ultimate" reporting template.
 *
 * IA pivot from AgencyAnalytics's 60-tile KPI grid to a creative-first
 * layout (per Motion / Triple Whale conventions): on TikTok the ad IS
 * the variable, so the dashboard puts the creative on stage.
 *
 *   1. Context bar
 *   2. North-star strip — Hero ROAS + 4 KPI tiles (Spend, Results, CPA, CTR)
 *   3. Narrative + Insights
 *   4. Creative Wall — 9:16 thumbnail grid, top 6 ads by ROAS
 *   5. Trend chart — Spend vs Revenue dual-axis
 *   6. Top contributors
 *   7. Detail table
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
  CreativeWall,
  deriveInsights,
} from "./ultimate";

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

function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#25F4EE"
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z"
      />
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
          { key: "results", label: "Results", align: "right" },
          { key: "cpa", label: "Cost / Result", align: "right" },
          { key: "ctr", label: "CTR", align: "right" },
          { key: "impressions", label: "Impressions", align: "right" },
        ]
      : level === "adset"
      ? [
          { key: "name", label: "Ad Group", align: "left" },
          { key: "campaign", label: "Campaign", align: "left" },
          { key: "spend", label: "Spend", align: "right" },
          { key: "results", label: "Results", align: "right" },
          { key: "cpa", label: "Cost / Result", align: "right" },
          { key: "ctr", label: "CTR", align: "right" },
        ]
      : [
          { key: "ad", label: "Ad", align: "left" },
          { key: "campaign", label: "Campaign", align: "left" },
          { key: "spend", label: "Spend", align: "right" },
          { key: "results", label: "Results", align: "right" },
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
                <td colSpan={headers.length} className="px-4 py-12 text-center text-[var(--color-text-muted)] text-sm">
                  No data in this period.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.key} className="transition-colors hover:bg-white/[0.02]">
                  {headers.map((h) => {
                    let cell: React.ReactNode = DASH;
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
                              className="w-9 h-12 object-cover rounded shrink-0 bg-[var(--color-bg-soft)]"
                            />
                          ) : (
                            <div className="w-9 h-12 rounded bg-[var(--color-bg-soft)] shrink-0" />
                          )}
                          <span className="truncate text-[var(--color-text-primary)] max-w-[220px]">
                            {r.creativeBody ?? r.name}
                          </span>
                        </div>
                      );
                    } else if (h.key === "spend") cell = MYR(r.spend);
                    else if (h.key === "results") cell = NUM(r.conversions);
                    else if (h.key === "cpa") cell = r.conversions > 0 ? MYR(r.cpa) : DASH;
                    else if (h.key === "ctr") cell = r.impressions > 0 ? PCT(r.ctr) : DASH;
                    else if (h.key === "impressions") cell = NUM(r.impressions);
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

export function TikTokAATemplate(props: TikTokTemplateProps) {
  const { level, brandName, range, totals, daily, dailyImpressions, rows, adAccountOptions = [] } = props;
  const labels = levelLabels(level);

  if (!totals || !range) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-6 flex items-center gap-2 text-[var(--color-text-secondary)]">
            <TikTokIcon />
            <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
              TikTok Ads · {labels.plural}
            </h1>
          </header>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center text-sm text-[var(--color-text-muted)]">
            No brand assigned to this account yet.
          </div>
        </div>
      </div>
    );
  }

  const trendData = daily.map((d) => ({ date: d.date, primary: d.spend, secondary: d.revenue }));
  const dailySpendSpark = daily.map((d) => ({ value: d.spend }));
  const dailyImpSpark = dailyImpressions.map((d) => ({ value: d.value }));

  const insights =
    props.priorTotals && props.deltas
      ? deriveInsights({
          totals,
          priorTotals: { ...props.priorTotals, ctr: props.priorTotals.ctr, frequency: props.priorTotals.frequency ?? 0 },
          deltas: props.deltas,
          rows,
          daily,
          rangeDays: range.days,
        })
      : [];

  const topRow = rows.find((r) => r.spend > 0) ?? null;
  const hasRevenue = totals.revenue > 0;
  const heroLabel = hasRevenue ? "TikTok ROAS" : "Total Spend";
  const heroValue = hasRevenue ? X(totals.roas) : MYR(totals.spend);
  const heroDelta = hasRevenue ? props.deltas?.roas : props.deltas?.spend;
  const heroCaption = hasRevenue
    ? `${MYR_COMPACT(totals.revenue)} earned on ${MYR_COMPACT(totals.spend)} spent — ${range.days}-day window across ${rows.length} ${rows.length === 1 ? labels.singular.toLowerCase() : labels.plural.toLowerCase()}.`
    : `${range.days} days · ${KSHORT(totals.impressions)} impressions, ${NUM(totals.clicks)} clicks. Connect a Pixel event to track ROAS.`;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <TikTokIcon />
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--color-text-primary)] truncate">
              TikTok Ads · {labels.plural}
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

        {/* North-star + KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 sm:mb-6">
          <div className="lg:col-span-1">
            <HeroMetricCard
              label={heroLabel}
              value={heroValue}
              delta={heroDelta ?? null}
              caption={heroCaption}
              spark={hasRevenue ? daily.map((d) => ({ value: d.revenue })) : dailySpendSpark}
            />
          </div>
          <div className="lg:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
            <KpiTile label="Spend" value={MYR_COMPACT(totals.spend)} delta={props.deltas?.spend ?? null} invertDelta spark={dailySpendSpark} />
            <KpiTile label="Results" value={NUM(totals.conversions)} delta={props.deltas?.conversions ?? null} />
            <KpiTile label="Cost / Result" value={totals.conversions > 0 ? MYR(totals.cpa) : DASH} delta={props.deltas?.cpa ?? null} invertDelta />
            <KpiTile label="CTR" value={totals.impressions > 0 ? PCT(totals.ctr) : DASH} delta={props.deltas?.ctr ?? null} />
            <KpiTile label="Impressions" value={KSHORT(totals.impressions)} delta={props.deltas?.impressions ?? null} spark={dailyImpSpark} />
            <KpiTile label="Clicks" value={NUM(totals.clicks)} delta={props.deltas?.clicks ?? null} />
            <KpiTile label="Video Views" value={KSHORT(totals.videoViews)} hint="2-second + plays" />
            <KpiTile label="Avg CPM" value={totals.impressions > 0 ? MYR(totals.cpm) : DASH} delta={props.deltas?.cpm ?? null} invertDelta />
          </div>
        </div>

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

        {/* Creative Wall — TikTok hero (replaces the 60-tile grid) */}
        {level === "ad" ? (
          <Section title="Creative wall" hint="Top performing ads, scored on ROAS + CTR + conversions" className="mb-4 sm:mb-6">
            <CreativeWall rows={rows} />
          </Section>
        ) : (
          <Section title="Top performers" hint={`${labels.plural} ranked by spend`} className="mb-4 sm:mb-6">
            <ContributionBars
              title={`Spend by ${labels.singular.toLowerCase()}`}
              total={rows.reduce((s, r) => s + r.spend, 0)}
              formatValue={MYR_COMPACT}
              rows={rows
                .filter((r) => r.spend > 0)
                .slice(0, 5)
                .map((r) => ({
                  name: r.name,
                  value: r.spend,
                  sub: r.roas > 0 ? `${X(r.roas)} ROAS · ${NUM(r.conversions)} results` : `${NUM(r.clicks)} clicks · ${PCT(r.ctr)} CTR`,
                }))}
            />
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

        {/* Snapshot */}
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
                sub: r.roas > 0 ? `${X(r.roas)} ROAS` : `${NUM(r.clicks)} clicks`,
              }))}
          />
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 sm:p-5 lg:p-6 flex flex-col">
            <h3 className="text-sm font-medium tracking-tight text-[var(--color-text-secondary)] mb-4">
              Account snapshot
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-[var(--color-text-muted)]">Active {labels.plural.toLowerCase()}</dt>
              <dd className="text-right tabular-nums text-[var(--color-text-primary)]">{rows.length}</dd>
              <dt className="text-[var(--color-text-muted)]">With spend</dt>
              <dd className="text-right tabular-nums text-[var(--color-text-primary)]">
                {rows.filter((r) => r.spend > 0).length}
              </dd>
              <dt className="text-[var(--color-text-muted)]">With conversions</dt>
              <dd className="text-right tabular-nums text-[var(--color-text-primary)]">
                {rows.filter((r) => r.conversions > 0).length}
              </dd>
              <dt className="text-[var(--color-text-muted)]">Conv. rate</dt>
              <dd className="text-right tabular-nums text-[var(--color-text-primary)]">
                {totals.clicks > 0 ? PCT(totals.conversionRate) : DASH}
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
                {dailyImpressions.length} day{dailyImpressions.length === 1 ? "" : "s"} of data
              </span>
            </div>
          </div>
        </div>

        <Section title={`All ${labels.plural.toLowerCase()}`} hint={`Sorted by spend · ${rows.length} row${rows.length === 1 ? "" : "s"}`}>
          <DataTable level={level} rows={rows} />
        </Section>

        <p className="text-[11px] text-[var(--color-text-muted)] mt-4 sm:mt-6">
          Data sourced from TikTok Ads Manager via official APIs · Last refreshed just now.
        </p>
      </div>
    </div>
  );
}
