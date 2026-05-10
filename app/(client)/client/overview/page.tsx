import { requireClient } from "@/lib/auth/guards";
import { Card } from "@/components/ui/card";
import { parseDateRange } from "@/lib/client-data/aggregate";
import { loadOverviewData, withRevenueTotals } from "@/lib/client-data/overview-data";
import { HeroKPIStrip } from "@/components/client/hero-kpi-strip";
import { GoalPacingBar } from "@/components/client/goal-pacing-bar";
import { AINarrativeCard } from "@/components/client/ai-narrative-card";
import { DualAxisChart } from "@/components/client/dual-axis-chart";
import { ChannelBreakdown } from "@/components/client/channel-breakdown";
import { BestCampaignCallout } from "@/components/client/best-campaign-callout";
import { TopCampaignsTable } from "@/components/client/top-campaigns-table";
import { DateRangePicker } from "@/components/client/date-range-picker";
import { AdAccountFilter, type AdAccountOption } from "@/components/client/ad-account-filter";
import { ChartAnnotationsManager } from "@/components/client/chart-annotations-form";
import { GoalsProgressGrid } from "@/components/client/goals-progress-grid";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const fmtMyr = (n: number) =>
  `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtInt = (n: number) => n.toLocaleString();
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

export default async function ClientOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; ad_accounts?: string }>;
}) {
  const params = await searchParams;
  const { start, end } = parseDateRange(params);
  const adAccountIds = (params.ad_accounts ?? "").split(",").filter(Boolean);
  const user = await requireClient();
  const raw = await loadOverviewData({ userId: user.id, start, end, adAccountIds });

  // Pull this brand's discovered Ad Accounts so the filter chip can render
  // them. Empty list means "no filter possible" → chip auto-hides.
  const supabase = await createClient();
  const { data: brandRow } = raw
    ? await supabase
        .from("brands")
        .select("id")
        .eq("assigned_client_user_id", user.id)
        .maybeSingle()
    : { data: null };
  const { data: adAccounts } = brandRow
    ? await supabase
        .from("brand_platform_ad_accounts")
        .select("platform, platform_ad_account_id, ad_account_name, currency")
        .eq("brand_id", brandRow.id as string)
        .order("ad_account_name", { ascending: true })
    : { data: [] };
  const adAccountOptions: AdAccountOption[] = (adAccounts ?? []).map((a) => ({
    platform: a.platform as string,
    platformAdAccountId: a.platform_ad_account_id as string,
    adAccountName: (a.ad_account_name as string) ?? null,
    currency: (a.currency as string) ?? null,
  }));

  if (!raw) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Card className="text-center py-12">
          <h1 className="font-display font-bold text-2xl mb-3">No brand assigned yet</h1>
          <p className="text-[var(--color-text-secondary)]">
            Your agency hasn&apos;t connected your data yet. Hubungi mereka untuk mula tracking.
          </p>
        </Card>
      </div>
    );
  }

  const data = withRevenueTotals(raw);

  // Compute days elapsed in current period (for goal pacing)
  const today = new Date();
  const startDate = new Date(data.range.start);
  const daysElapsed = Math.max(
    1,
    Math.min(
      data.range.days,
      Math.round((today.getTime() - startDate.getTime()) / 86_400_000) + 1
    )
  );

  // KPI tiles
  const kpiTiles = [
    {
      label: "Spend",
      value: fmtMyr(data.current.spend),
      delta: data.deltas.spend,
      deltaPositiveIsGood: false,
      accent: "text-[var(--color-orange)]",
    },
    {
      label: "Revenue",
      value: fmtMyr(data.current.revenue),
      delta: data.deltas.revenue,
      deltaPositiveIsGood: true,
      accent: "text-emerald-400",
    },
    {
      label: "ROAS",
      value: data.current.roas > 0 ? `${data.current.roas.toFixed(2)}×` : "—",
      delta: data.deltas.roas,
      deltaPositiveIsGood: true,
      accent: "text-[var(--color-amber)]",
    },
    {
      label: "Conversions",
      value: fmtInt(data.current.conversions),
      delta: data.deltas.conversions,
      deltaPositiveIsGood: true,
      accent: "text-[var(--color-lime)]",
    },
    {
      label: "CTR",
      value: fmtPct(data.current.ctr),
      delta: data.deltas.ctr,
      deltaPositiveIsGood: true,
      accent: "text-cyan-400",
    },
    {
      label: "CPA",
      value: data.current.conversions > 0 ? fmtMyr(data.current.cpa) : "—",
      delta: data.deltas.cpa,
      deltaPositiveIsGood: false,
      accent: "text-rose-300",
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display font-extrabold text-3xl lg:text-4xl mb-1">{data.brand.name}</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Performance dashboard · {data.range.start} hingga {data.range.end} ({data.range.days} hari)
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AdAccountFilter accounts={adAccountOptions} />
            <DateRangePicker />
          </div>
        </div>
      </header>

      {/* Goal pacing bar (budget-based, only if there's a topup) */}
      {data.budget.totalTopup > 0 && (
        <GoalPacingBar
          spent={data.current.spend}
          budget={data.budget.totalTopup}
          daysElapsed={daysElapsed}
          daysTotal={data.range.days}
        />
      )}

      {/* Hero KPI strip */}
      <HeroKPIStrip tiles={kpiTiles} />

      {/* KPI goals (set by agency) */}
      <GoalsProgressGrid goals={data.goals} />

      {/* AI narrative — empty state for now until LLM is wired */}
      <AINarrativeCard content={null} />

      {/* Dual-axis chart with annotation pins */}
      <DualAxisChart current={data.daily} prior={data.priorDaily} annotations={data.annotations} />

      {/* Annotations list (read-only on client portal, editable for agency) */}
      <ChartAnnotationsManager
        brandId={data.brand.id}
        rangeStart={data.range.start}
        rangeEnd={data.range.end}
        annotations={data.annotations}
        canEdit={false}
      />

      {/* Channel breakdown */}
      <ChannelBreakdown platforms={data.byPlatform} />

      {/* Best campaign */}
      <BestCampaignCallout campaign={data.bestCampaign} />

      {/* Top campaigns table — click row to drill in */}
      <TopCampaignsTable rows={data.topCampaigns} drillBase="/client/campaign" />

      {/* Budget summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <BudgetTile label="Current balance" value={fmtMyr(data.budget.currentBalance)} accent="text-[var(--color-lime)]" />
        <BudgetTile label="Total topup" value={fmtMyr(data.budget.totalTopup)} accent="text-[var(--color-text-primary)]" />
        <BudgetTile label="Total spent" value={fmtMyr(data.budget.totalSpent)} accent="text-[var(--color-orange)]" />
      </div>
    </div>
  );
}

function BudgetTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-4">
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold mb-1">
        {label}
      </div>
      <div className={`font-display font-extrabold text-2xl ${accent}`}>{value}</div>
    </div>
  );
}
