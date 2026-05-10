import { createClient } from "@/lib/supabase/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { aggregateAdData, parseDateRange, summarize } from "@/lib/client-data/aggregate";
import type { Json } from "@/lib/supabase/types";
import { HeroKPIStrip } from "@/components/client/hero-kpi-strip";
import { DualAxisChart } from "@/components/client/dual-axis-chart";
import { DateRangePicker } from "@/components/client/date-range-picker";
import { TopCampaignsTable } from "@/components/client/top-campaigns-table";
import { SingleMetricTrend } from "@/components/client/single-metric-trend";
import { TopBreakdownBars } from "@/components/client/top-breakdown-bars";
import { DistributionDonut } from "@/components/client/distribution-donut";

export const dynamic = "force-dynamic";

const fmtMyr = (n: number) =>
  `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtInt = (n: number) => n.toLocaleString();
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

function deltaPct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function isoMinusDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const PLATFORM_GROUPS: Record<string, { label: string; values: string[] }> = {
  all: { label: "All platforms", values: [] },
  facebook: { label: "Facebook Ads", values: ["meta_ads", "meta", "meta_insights"] },
  google: { label: "Google Ads", values: ["google_ads"] },
  tiktok: { label: "TikTok Ads", values: ["tiktok_ads", "tiktok"] },
};

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; platform?: string }>;
}) {
  const sp = await searchParams;
  const { start, end } = parseDateRange(sp);
  const platform = (sp.platform ?? "all") as keyof typeof PLATFORM_GROUPS;
  const group = PLATFORM_GROUPS[platform] ?? PLATFORM_GROUPS.all;
  const user = await requireAgencyStaff();
  const supabase = await createClient();

  const days = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1);
  const priorEnd = isoMinusDays(start, 1);
  const priorStart = isoMinusDays(priorEnd, days - 1);

  // Build queries scoped to company; optionally narrow by platform group
  let currQ = supabase
    .from("ad_data")
    .select("platform, brand_id, date_start, data")
    .eq("company_id", user.company_id ?? "")
    .gte("date_start", start)
    .lte("date_start", end);
  let priorQ = supabase
    .from("ad_data")
    .select("platform, brand_id, date_start, data")
    .eq("company_id", user.company_id ?? "")
    .gte("date_start", priorStart)
    .lte("date_start", priorEnd);
  if (group.values.length > 0) {
    currQ = currQ.in("platform", group.values);
    priorQ = priorQ.in("platform", group.values);
  }

  const [{ data: currRaw }, { data: priorRaw }, { data: brandList }] = await Promise.all([
    currQ,
    priorQ,
    supabase
      .from("brands")
      .select("id, name")
      .eq("company_id", user.company_id ?? "")
      .eq("is_active", true),
  ]);

  const brandNameById = new Map((brandList ?? []).map((b) => [b.id as string, b.name as string]));

  // Cast for aggregate helper compatibility (it expects { platform, date_start, data })
  const currForAgg = (currRaw ?? []).map((r) => ({
    platform: r.platform as string,
    date_start: r.date_start as string,
    data: r.data as Json,
  }));
  const priorForAgg = (priorRaw ?? []).map((r) => ({
    platform: r.platform as string,
    date_start: r.date_start as string,
    data: r.data as Json,
  }));

  const totals = summarize(aggregateAdData(currForAgg, "campaign"));
  const priorTotals = summarize(aggregateAdData(priorForAgg, "campaign"));
  const campaignRows = aggregateAdData(currForAgg, "campaign");

  // Build daily series
  const buildDaily = (rs: typeof currRaw) => {
    const m = new Map<string, { spend: number; revenue: number }>();
    for (const r of rs ?? []) {
      const d = (r.data as Record<string, unknown>) ?? {};
      const date = r.date_start as string;
      const ex = m.get(date) ?? { spend: 0, revenue: 0 };
      ex.spend += Number(d.spend ?? d.cost ?? 0);
      ex.revenue += Number(d.purchase_value ?? d.conversion_value ?? d.revenue ?? 0);
      m.set(date, ex);
    }
    return [...m.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));
  };
  const daily = buildDaily(currRaw);
  const priorDaily = buildDaily(priorRaw);
  const dailySpendOnly = daily.map((d) => ({ date: d.date, value: d.spend }));

  // Top brands by spend (story row's middle column)
  const spendByBrandMap = new Map<string, number>();
  for (const r of currRaw ?? []) {
    const id = r.brand_id as string;
    const d = (r.data as Record<string, unknown>) ?? {};
    spendByBrandMap.set(id, (spendByBrandMap.get(id) ?? 0) + Number(d.spend ?? d.cost ?? 0));
  }
  const topBrandsBySpend = [...spendByBrandMap.entries()]
    .map(([id, value]) => ({
      key: id,
      name: brandNameById.get(id) ?? "Unknown brand",
      value,
    }))
    .sort((a, b) => b.value - a.value);

  // Spend distribution by platform (donut)
  const spendByPlatformMap = new Map<string, number>();
  for (const r of currRaw ?? []) {
    const p = r.platform as string;
    const label =
      p === "meta_ads" || p === "meta" || p === "meta_insights" ? "Facebook"
      : p === "google_ads" ? "Google"
      : p === "tiktok_ads" || p === "tiktok" ? "TikTok"
      : p;
    const d = (r.data as Record<string, unknown>) ?? {};
    spendByPlatformMap.set(label, (spendByPlatformMap.get(label) ?? 0) + Number(d.spend ?? d.cost ?? 0));
  }
  const spendByPlatform = [...spendByPlatformMap.entries()].map(([key, value]) => ({
    key,
    label: key,
    value,
  }));

  const tiles = [
    { label: "Spend", value: fmtMyr(totals.spend), delta: deltaPct(totals.spend, priorTotals.spend), deltaPositiveIsGood: false, accent: "text-[var(--color-orange)]" },
    { label: "Revenue", value: fmtMyr(totals.revenue), delta: deltaPct(totals.revenue, priorTotals.revenue), deltaPositiveIsGood: true, accent: "text-emerald-400" },
    { label: "ROAS", value: totals.roas > 0 ? `${totals.roas.toFixed(2)}×` : "—", delta: deltaPct(totals.roas, priorTotals.roas), deltaPositiveIsGood: true, accent: "text-[var(--color-amber)]" },
    { label: "Conversions", value: fmtInt(totals.conversions), delta: deltaPct(totals.conversions, priorTotals.conversions), deltaPositiveIsGood: true, accent: "text-[var(--color-lime)]" },
    { label: "CTR", value: fmtPct(totals.ctr), delta: deltaPct(totals.ctr, priorTotals.ctr), deltaPositiveIsGood: true, accent: "text-cyan-400" },
    { label: "CPA", value: totals.conversions > 0 ? fmtMyr(totals.cpa) : "—", delta: deltaPct(totals.cpa, priorTotals.cpa), deltaPositiveIsGood: false, accent: "text-rose-300" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl mb-1">Campaigns</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Across all clients · {start} → {end} ({days} days)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PlatformTabs current={platform as string} />
          <DateRangePicker />
        </div>
      </header>

      <HeroKPIStrip tiles={tiles} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        <SingleMetricTrend title="Daily spend" data={dailySpendOnly} prefix="RM " />
        <TopBreakdownBars title="Top clients by spend" items={topBrandsBySpend} />
        <DistributionDonut title="Spend by platform" slices={spendByPlatform} centerLabel="Total" />
      </div>

      <DualAxisChart current={daily} prior={priorDaily} />

      <TopCampaignsTable rows={campaignRows} />
    </div>
  );
}

function PlatformTabs({ current }: { current: string }) {
  const tabs = [
    { key: "all", label: "All" },
    { key: "facebook", label: "Facebook" },
    { key: "google", label: "Google" },
    { key: "tiktok", label: "TikTok" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-1">
      {tabs.map((t) => {
        const isActive = current === t.key;
        // Build a self-link that preserves start/end query params via no-JS approach:
        // an `a` tag with the platform set; date params are preserved by the browser
        // when clicked (because Next prefetches the route, server reads searchParams).
        const href = `?platform=${t.key}`;
        return (
          <a
            key={t.key}
            href={href}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              isActive
                ? "bg-[var(--color-orange)] text-black"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {t.label}
          </a>
        );
      })}
    </div>
  );
}
