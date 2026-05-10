import { requireClient } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { aggregateAdData, summarize, parseDateRange } from "@/lib/client-data/aggregate";
import { HeroKPIStrip } from "@/components/client/hero-kpi-strip";
import { DualAxisChart } from "@/components/client/dual-axis-chart";
import { DateRangePicker } from "@/components/client/date-range-picker";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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

// Drill-down view for a single campaign across all platforms.
// The route id is the campaign's external id from ad_data.data.campaign_id.
export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { id: campaignId } = await params;
  const sp = await searchParams;
  const { start, end } = parseDateRange(sp);
  const user = await requireClient();
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("assigned_client_user_id", user.id)
    .maybeSingle();

  if (!brand) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Card className="text-center py-12">
          <h1 className="font-display font-bold text-2xl">No brand assigned.</h1>
        </Card>
      </div>
    );
  }

  const days = Math.max(
    1,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1
  );
  const priorEnd = isoMinusDays(start, 1);
  const priorStart = isoMinusDays(priorEnd, days - 1);

  const [{ data: currData }, { data: priorData }] = await Promise.all([
    supabase
      .from("ad_data")
      .select("platform, date_start, data")
      .eq("brand_id", brand.id as string)
      .gte("date_start", start)
      .lte("date_start", end),
    supabase
      .from("ad_data")
      .select("platform, date_start, data")
      .eq("brand_id", brand.id as string)
      .gte("date_start", priorStart)
      .lte("date_start", priorEnd),
  ]);

  // Filter by campaign id at the row level (data.campaign_id matches)
  const matches = (rows: typeof currData) =>
    (rows ?? []).filter((r) => {
      const d = (r.data as Record<string, unknown>) ?? {};
      const cid = String(d.campaign_id ?? d.campaign_id_string ?? "");
      const cname = String(d.campaign_name ?? d.campaign ?? "");
      return cid === campaignId || cname === campaignId;
    });

  const currCampaign = matches(currData);
  const priorCampaign = matches(priorData);

  const campaignAgg = aggregateAdData(currCampaign as { platform: string; date_start: string; data: import("@/lib/supabase/types").Json }[], "campaign");
  const priorAgg = aggregateAdData(priorCampaign as { platform: string; date_start: string; data: import("@/lib/supabase/types").Json }[], "campaign");
  const totals = summarize(campaignAgg);
  const priorTotals = summarize(priorAgg);

  const campaignName = campaignAgg[0]?.name ?? campaignId;
  const platforms = [...new Set((currCampaign ?? []).map((r) => r.platform as string))];

  // Build daily series
  const buildDaily = (rows: typeof currData) => {
    const m = new Map<string, { spend: number; revenue: number }>();
    for (const r of rows ?? []) {
      const d = (r.data as Record<string, unknown>) ?? {};
      const date = r.date_start as string;
      const ex = m.get(date) ?? { spend: 0, revenue: 0 };
      ex.spend += Number(d.spend ?? d.cost ?? 0);
      ex.revenue += Number(d.purchase_value ?? d.conversion_value ?? d.revenue ?? 0);
      m.set(date, ex);
    }
    return [...m.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));
  };
  const daily = buildDaily(currCampaign);
  const priorDaily = buildDaily(priorCampaign);

  // Drill into ad sets / ads for this campaign
  const adsetAgg = aggregateAdData(currCampaign as { platform: string; date_start: string; data: import("@/lib/supabase/types").Json }[], "adset");
  const adAgg = aggregateAdData(currCampaign as { platform: string; date_start: string; data: import("@/lib/supabase/types").Json }[], "ad");

  const tiles = [
    { label: "Spend", value: fmtMyr(totals.spend), delta: deltaPct(totals.spend, priorTotals.spend), deltaPositiveIsGood: false, accent: "text-[var(--color-orange)]" },
    { label: "Revenue", value: fmtMyr(totals.revenue), delta: deltaPct(totals.revenue, priorTotals.revenue), deltaPositiveIsGood: true, accent: "text-emerald-400" },
    { label: "ROAS", value: totals.roas > 0 ? `${totals.roas.toFixed(2)}×` : "—", delta: deltaPct(totals.roas, priorTotals.roas), deltaPositiveIsGood: true, accent: "text-[var(--color-amber)]" },
    { label: "Conversions", value: fmtInt(totals.conversions), delta: deltaPct(totals.conversions, priorTotals.conversions), deltaPositiveIsGood: true, accent: "text-[var(--color-lime)]" },
    { label: "CTR", value: fmtPct(totals.ctr), delta: deltaPct(totals.ctr, priorTotals.ctr), deltaPositiveIsGood: true, accent: "text-cyan-400" },
    { label: "CPA", value: totals.conversions > 0 ? fmtMyr(totals.cpa) : "—", delta: deltaPct(totals.cpa, priorTotals.cpa), deltaPositiveIsGood: false, accent: "text-rose-300" },
  ];

  const platformPill = (p: string) => {
    if (p.startsWith("meta")) return { label: "Facebook Ads", className: "bg-blue-500/15 text-blue-300" };
    if (p.startsWith("google")) return { label: "Google Ads", className: "bg-amber-500/15 text-amber-300" };
    return { label: "TikTok Ads", className: "bg-pink-500/15 text-pink-300" };
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <Link href="/client/overview" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-orange)] flex items-center gap-1 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to overview
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              {platforms.map((p) => {
                const pill = platformPill(p);
                return (
                  <span key={p} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${pill.className}`}>
                    {pill.label}
                  </span>
                );
              })}
            </div>
            <h1 className="font-display font-extrabold text-3xl lg:text-4xl mb-1 truncate">{campaignName}</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {brand.name as string} · {start} to {end} ({days} days)
            </p>
          </div>
          <DateRangePicker />
        </div>
      </header>

      <HeroKPIStrip tiles={tiles} />
      <DualAxisChart current={daily} prior={priorDaily} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--color-border)]">
            <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold mb-0.5">
              Ad sets / ad groups
            </div>
            <div className="text-sm font-bold">{adsetAgg.length} group{adsetAgg.length === 1 ? "" : "s"}</div>
          </div>
          {adsetAgg.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">No ad sets in this period.</div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {adsetAgg.slice(0, 8).map((a) => (
                <div key={a.key} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate" title={a.name}>{a.name}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)] font-mono">
                      {fmtMyr(a.spend)} spend · {a.conversions} conv
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold">
                      {a.roas > 0 ? <span className="text-emerald-400">{a.roas.toFixed(2)}×</span> : "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--color-border)]">
            <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold mb-0.5">
              Ads
            </div>
            <div className="text-sm font-bold">{adAgg.length} ad{adAgg.length === 1 ? "" : "s"}</div>
          </div>
          {adAgg.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">No ads in this period.</div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {adAgg.slice(0, 8).map((a) => (
                <div key={a.key} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate" title={a.name}>{a.name}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)] font-mono">
                      {fmtMyr(a.spend)} spend · {fmtPct(a.ctr)} CTR
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold">
                      {a.roas > 0 ? <span className="text-emerald-400">{a.roas.toFixed(2)}×</span> : "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
