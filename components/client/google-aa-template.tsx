/**
 * Google Ads — client-portal "ultimate" reporting template.
 *
 * Search-intent oriented IA per Optmyzr / Adalysis / native Google Ads UI:
 *
 *   1. Context bar
 *   2. North-star strip — Hero Conversions or ROAS + KPI tiles
 *   3. Narrative + Insights
 *   4. Trend — Cost vs Conversions dual-axis (with Target CPA reference if set)
 *   5. Top contributors — campaigns ranked by spend, with conv-rate chip
 *   6. Detail table — STATUS + NETWORK columns native to Google Ads
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
} from "./ultimate";

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
}

function levelLabels(level: "campaign" | "adset" | "ad") {
  if (level === "campaign") return { plural: "Campaigns", singular: "Campaign" };
  if (level === "ad") return { plural: "Ads", singular: "Ad" };
  return { plural: "Ad Groups", singular: "Ad Group" };
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC04" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function StatusPillCell({ status }: { status: string | null }) {
  const norm = (status ?? "").toLowerCase();
  const isActive = norm === "active" || norm === "enabled" || norm === "running" || norm === "live";
  const isPaused = norm.includes("paus") || norm === "stopped" || norm === "disabled";
  if (!norm) return <StatusPill variant="neutral" label="—" />;
  if (isActive) return <StatusPill variant="positive" label="ENABLED" />;
  if (isPaused) return <StatusPill variant="info" label="PAUSED" />;
  return <StatusPill variant="neutral" label={norm.toUpperCase()} />;
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
          { key: "status", label: "Status", align: "left" },
          { key: "spend", label: "Cost", align: "right" },
          { key: "conversions", label: "Conv.", align: "right" },
          { key: "cpa", label: "Cost / Conv.", align: "right" },
          { key: "convrate", label: "Conv. Rate", align: "right" },
          { key: "cpc", label: "Avg CPC", align: "right" },
          { key: "clicks", label: "Clicks", align: "right" },
        ]
      : level === "adset"
      ? [
          { key: "name", label: "Ad Group", align: "left" },
          { key: "campaign", label: "Campaign", align: "left" },
          { key: "status", label: "Status", align: "left" },
          { key: "spend", label: "Cost", align: "right" },
          { key: "conversions", label: "Conv.", align: "right" },
          { key: "cpa", label: "Cost / Conv.", align: "right" },
          { key: "cpc", label: "Avg CPC", align: "right" },
        ]
      : [
          { key: "ad", label: "Ad", align: "left" },
          { key: "campaign", label: "Campaign", align: "left" },
          { key: "status", label: "Status", align: "left" },
          { key: "spend", label: "Cost", align: "right" },
          { key: "conversions", label: "Conv.", align: "right" },
          { key: "cpa", label: "Cost / Conv.", align: "right" },
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
        <table className="w-full text-sm min-w-[820px]">
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
                      cell = (
                        <div className="flex flex-col leading-tight max-w-[220px]">
                          <span className="text-[var(--color-text-primary)] truncate">{r.name}</span>
                          {r.creativeBody && (
                            <span className="text-[11px] text-[var(--color-text-muted)] truncate">{r.creativeBody}</span>
                          )}
                        </div>
                      );
                    } else if (h.key === "status") cell = <StatusPillCell status={r.status} />;
                    else if (h.key === "spend") cell = MYR(r.spend);
                    else if (h.key === "conversions") cell = NUM(r.conversions);
                    else if (h.key === "cpa") cell = r.conversions > 0 ? MYR(r.cpa) : DASH;
                    else if (h.key === "convrate") cell = r.clicks > 0 ? PCT(r.conversionRate) : DASH;
                    else if (h.key === "cpc") cell = r.clicks > 0 ? MYR(r.cpc) : DASH;
                    else if (h.key === "clicks") cell = NUM(r.clicks);
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

export function GoogleAATemplate(props: GoogleTemplateProps) {
  const { level, brandName, range, totals, daily, dailyClicks, rows, adAccountOptions = [] } = props;
  const labels = levelLabels(level);

  if (!totals || !range) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-6 flex items-center gap-2 text-[var(--color-text-secondary)]">
            <GoogleIcon />
            <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
              Google Ads · {labels.plural}
            </h1>
          </header>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center text-sm text-[var(--color-text-muted)]">
            No brand assigned to this account yet.
          </div>
        </div>
      </div>
    );
  }

  // Google's hero is Cost-vs-Conversions (not spend-vs-revenue) since
  // many search accounts are lead-gen and don't have revenue attached.
  const trendData = daily.map((d) => ({ date: d.date, primary: d.spend, secondary: d.revenue }));
  const dailySpendSpark = daily.map((d) => ({ value: d.spend }));
  const dailyClicksSpark = dailyClicks.map((d) => ({ value: d.value }));

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
  const hasConversions = totals.conversions > 0;

  // Hero priority: ROAS if revenue, else Cost-per-Conversion if conv,
  // else total Cost. Cost-per-Conversion is invertDelta=true.
  let heroLabel: string;
  let heroValue: string;
  let heroDelta: number | null;
  let invertHeroDelta = false;
  let heroCaption: string;
  if (hasRevenue) {
    heroLabel = "Return on Ad Spend";
    heroValue = X(totals.roas);
    heroDelta = props.deltas?.roas ?? null;
    heroCaption = `${MYR_COMPACT(totals.revenue)} earned on ${MYR_COMPACT(totals.spend)} spent over ${range.days} days.`;
  } else if (hasConversions) {
    heroLabel = "Cost / Conversion";
    heroValue = MYR(totals.cpa);
    heroDelta = props.deltas?.cpa ?? null;
    invertHeroDelta = true;
    heroCaption = `${NUM(totals.conversions)} conversion${totals.conversions === 1 ? "" : "s"} captured over ${range.days} days at ${MYR(totals.cpa)} each.`;
  } else {
    heroLabel = "Total Spend";
    heroValue = MYR(totals.spend);
    heroDelta = props.deltas?.spend ?? null;
    heroCaption = `${range.days} days · ${NUM(totals.clicks)} clicks · ${KSHORT(totals.impressions)} impressions. Set up conversion tracking to see CPA.`;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <GoogleIcon />
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--color-text-primary)] truncate">
              Google Ads · {labels.plural}
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
              delta={heroDelta}
              invertDelta={invertHeroDelta}
              caption={heroCaption}
              spark={hasRevenue ? daily.map((d) => ({ value: d.revenue })) : dailySpendSpark}
            />
          </div>
          <div className="lg:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
            <KpiTile label="Cost" value={MYR_COMPACT(totals.spend)} delta={props.deltas?.spend ?? null} invertDelta spark={dailySpendSpark} />
            <KpiTile label="Conversions" value={NUM(totals.conversions)} delta={props.deltas?.conversions ?? null} />
            <KpiTile label="Cost / Conv." value={hasConversions ? MYR(totals.cpa) : DASH} delta={props.deltas?.cpa ?? null} invertDelta />
            <KpiTile label="Conv. Rate" value={totals.clicks > 0 ? PCT(totals.conversionRate) : DASH} />
            <KpiTile label="Clicks" value={NUM(totals.clicks)} delta={props.deltas?.clicks ?? null} spark={dailyClicksSpark} />
            <KpiTile label="Avg CPC" value={totals.clicks > 0 ? MYR(totals.cpc) : DASH} delta={props.deltas?.cpc ?? null} invertDelta />
            <KpiTile label="CTR" value={totals.impressions > 0 ? PCT(totals.ctr) : DASH} delta={props.deltas?.ctr ?? null} />
            <KpiTile label="Impressions" value={KSHORT(totals.impressions)} delta={props.deltas?.impressions ?? null} />
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

        {/* Trend — Cost vs Conversions/Revenue */}
        <Section
          title={hasRevenue ? "Cost vs Revenue trend" : "Cost trend"}
          hint={`Daily series · ${range.days} days`}
          className="mb-4 sm:mb-6"
        >
          {hasRevenue ? (
            <DualAxisTrend
              data={trendData}
              primaryLabel="Cost"
              secondaryLabel="Revenue"
              primaryFormat={(n) => MYR_COMPACT(n)}
              secondaryFormat={(n) => MYR_COMPACT(n)}
            />
          ) : (
            <DualAxisTrend
              data={daily.map((d, i) => ({
                date: d.date,
                primary: d.spend,
                secondary: dailyClicks[i]?.value ?? 0,
              }))}
              primaryLabel="Cost"
              secondaryLabel="Clicks"
              primaryFormat={(n) => MYR_COMPACT(n)}
            />
          )}
        </Section>

        {/* Top contributors + snapshot */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 sm:mb-6">
          <ContributionBars
            title="Top contributors by cost"
            total={rows.reduce((s, r) => s + r.spend, 0)}
            formatValue={MYR_COMPACT}
            rows={rows
              .filter((r) => r.spend > 0)
              .slice(0, 5)
              .map((r) => ({
                name: r.name,
                value: r.spend,
                sub: r.conversions > 0
                  ? `${NUM(r.conversions)} conv. · ${MYR(r.cpa)} CPA`
                  : `${NUM(r.clicks)} clicks · ${PCT(r.ctr)} CTR`,
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
              <dt className="text-[var(--color-text-muted)]">With cost</dt>
              <dd className="text-right tabular-nums text-[var(--color-text-primary)]">
                {rows.filter((r) => r.spend > 0).length}
              </dd>
              <dt className="text-[var(--color-text-muted)]">Converting</dt>
              <dd className="text-right tabular-nums text-[var(--color-text-primary)]">
                {rows.filter((r) => r.conversions > 0).length}
              </dd>
              <dt className="text-[var(--color-text-muted)]">Conv. rate</dt>
              <dd className="text-right tabular-nums text-[var(--color-text-primary)]">
                {totals.clicks > 0 ? PCT(totals.conversionRate) : DASH}
              </dd>
              <dt className="text-[var(--color-text-muted)]">Avg CPC</dt>
              <dd className="text-right tabular-nums text-[var(--color-text-primary)]">
                {totals.clicks > 0 ? MYR(totals.cpc) : DASH}
              </dd>
              <dt className="text-[var(--color-text-muted)]">Cost / Conv.</dt>
              <dd className="text-right tabular-nums text-[var(--color-text-primary)]">
                {hasConversions ? MYR(totals.cpa) : DASH}
              </dd>
            </dl>
            <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <StatusPill
                variant={totals.spend > 0 ? "positive" : "neutral"}
                label={totals.spend > 0 ? "Active" : "No spend"}
              />
              <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                {dailyClicks.length} day{dailyClicks.length === 1 ? "" : "s"} of data
              </span>
            </div>
          </div>
        </div>

        <Section title={`All ${labels.plural.toLowerCase()}`} hint={`Sorted by cost · ${rows.length} row${rows.length === 1 ? "" : "s"}`}>
          <DataTable level={level} rows={rows} />
        </Section>

        <p className="text-[11px] text-[var(--color-text-muted)] mt-4 sm:mt-6">
          Data sourced from Google Ads via official APIs · Last refreshed just now.
        </p>
      </div>
    </div>
  );
}
