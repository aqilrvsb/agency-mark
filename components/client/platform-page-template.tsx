import type { AggregateRow } from "@/lib/client-data/aggregate";
import { HeroKPIStrip } from "./hero-kpi-strip";
import { DualAxisChart } from "./dual-axis-chart";
import { TopCampaignsTable } from "./top-campaigns-table";
import { DateRangePicker } from "./date-range-picker";
import { AdAccountFilter, type AdAccountOption } from "./ad-account-filter";
import { ChartAnnotationsManager, type AnnotationItem } from "./chart-annotations-form";

const fmtMyr = (n: number) =>
  `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtInt = (n: number) => n.toLocaleString();
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

export interface PlatformPageProps {
  platformLabel: string; // "Facebook Ads"
  platformAccent: string; // tailwind text color class
  level: "campaign" | "adset" | "ad";
  brandName?: string;
  range: { start: string; end: string; days: number } | null;
  totals: {
    spend: number;
    revenue: number;
    roas: number;
    conversions: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpa: number;
  } | null;
  deltas: {
    spend: number;
    revenue: number;
    roas: number;
    conversions: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpa: number;
  } | null;
  daily: { date: string; spend: number; revenue: number }[];
  priorDaily: { date: string; spend: number; revenue: number }[];
  rows: AggregateRow[];
  annotations?: AnnotationItem[];
  brandId?: string;
  adAccountOptions?: AdAccountOption[];
}

function levelLabel(level: "campaign" | "adset" | "ad", platformLabel: string): { plural: string; singular: string } {
  if (level === "campaign") return { plural: "Campaigns", singular: "Campaign" };
  if (level === "ad") return { plural: "Ads", singular: "Ad" };
  // Meta = Ad Sets; Google + TikTok = Ad Groups
  const isMeta = platformLabel.toLowerCase().includes("facebook") || platformLabel.toLowerCase().includes("meta");
  return isMeta ? { plural: "Ad Sets", singular: "Ad Set" } : { plural: "Ad Groups", singular: "Ad Group" };
}

export function PlatformPageTemplate({
  platformLabel,
  platformAccent,
  level,
  brandName,
  range,
  totals,
  deltas,
  daily,
  priorDaily,
  rows,
  annotations = [],
  brandId,
  adAccountOptions = [],
}: PlatformPageProps) {
  const labels = levelLabel(level, platformLabel);

  if (!totals || !deltas || !range) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <header className="mb-6">
          <div className={`text-xs uppercase tracking-widest font-bold mb-2 ${platformAccent}`}>{platformLabel}</div>
          <h1 className="font-display font-extrabold text-4xl mb-2">{labels.plural}</h1>
        </header>
        <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-12 text-center text-sm text-[var(--color-text-muted)]">
          No brand assigned to this account yet.
        </div>
      </div>
    );
  }

  const tiles = [
    {
      label: "Spend",
      value: fmtMyr(totals.spend),
      delta: deltas.spend,
      deltaPositiveIsGood: false,
      accent: "text-[var(--color-orange)]",
    },
    {
      label: "Revenue",
      value: fmtMyr(totals.revenue),
      delta: deltas.revenue,
      deltaPositiveIsGood: true,
      accent: "text-emerald-400",
    },
    {
      label: "ROAS",
      value: totals.roas > 0 ? `${totals.roas.toFixed(2)}×` : "—",
      delta: deltas.roas,
      deltaPositiveIsGood: true,
      accent: "text-[var(--color-amber)]",
    },
    {
      label: "Conversions",
      value: fmtInt(totals.conversions),
      delta: deltas.conversions,
      deltaPositiveIsGood: true,
      accent: "text-[var(--color-lime)]",
    },
    {
      label: "CTR",
      value: fmtPct(totals.ctr),
      delta: deltas.ctr,
      deltaPositiveIsGood: true,
      accent: "text-cyan-400",
    },
    {
      label: "CPA",
      value: totals.conversions > 0 ? fmtMyr(totals.cpa) : "—",
      delta: deltas.cpa,
      deltaPositiveIsGood: false,
      accent: "text-rose-300",
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className={`text-xs uppercase tracking-widest font-bold mb-2 ${platformAccent}`}>{platformLabel}</div>
          <h1 className="font-display font-extrabold text-3xl lg:text-4xl mb-1">{labels.plural}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {brandName ? `${brandName}'s ` : ""}
            {labels.plural.toLowerCase()} from {range.start} to {range.end} ({range.days} days)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AdAccountFilter accounts={adAccountOptions} />
          <DateRangePicker />
        </div>
      </header>

      <HeroKPIStrip tiles={tiles} />

      <DualAxisChart current={daily} prior={priorDaily} annotations={annotations} />

      {brandId && (
        <ChartAnnotationsManager
          brandId={brandId}
          rangeStart={range.start}
          rangeEnd={range.end}
          annotations={annotations}
          canEdit={false}
        />
      )}

      <TopCampaignsTable rows={rows} />
    </div>
  );
}
