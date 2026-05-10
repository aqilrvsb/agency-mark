import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { aggregateAdData, summarize, type AggregateRow } from "./aggregate";

export type ConnectedPlatform = "meta_ads" | "google_ads" | "tiktok_ads";

const PLATFORM_GROUPS: Record<ConnectedPlatform, string[]> = {
  meta_ads: ["meta_ads", "meta", "meta_insights"],
  google_ads: ["google_ads"],
  tiktok_ads: ["tiktok_ads", "tiktok"],
};

export interface DailyPoint {
  date: string;
  spend: number;
  revenue: number;
}

export interface PlatformBreakdown {
  platform: ConnectedPlatform;
  connected: boolean;
  spend: number;
  conversions: number;
  roas: number;
}

export interface AnnotationItem {
  id: string;
  anchor_date: string;
  body: string;
  created_at: string;
  author_name: string | null;
}

export interface OverviewData {
  brand: { id: string; name: string };
  annotations: AnnotationItem[];
  range: { start: string; end: string; days: number };
  current: {
    spend: number;
    revenue: number;
    roas: number;
    conversions: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpa: number;
  };
  deltas: {
    spend: number;
    revenue: number;
    roas: number;
    conversions: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpa: number;
  };
  daily: DailyPoint[];
  priorDaily: DailyPoint[];
  byPlatform: PlatformBreakdown[];
  topCampaigns: AggregateRow[];
  bestCampaign: AggregateRow | null;
  budget: {
    currentBalance: number;
    totalTopup: number;
    totalSpent: number;
  };
}

function deltaPct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function isoMinusDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function loadOverviewData(opts: {
  userId: string;
  start: string;
  end: string;
}): Promise<OverviewData | null> {
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("assigned_client_user_id", opts.userId)
    .maybeSingle();
  if (!brand) return null;

  const brandId = brand.id as string;

  // Window math
  const start = opts.start;
  const end = opts.end;
  const days = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1);
  const priorEnd = isoMinusDays(start, 1);
  const priorStart = isoMinusDays(priorEnd, days - 1);

  // Five parallel queries: current, prior, budget, brand_ad_accounts, annotations
  const [
    { data: currRows },
    { data: priorRows },
    { data: budget },
    { data: connections },
    { data: annotations },
  ] = await Promise.all([
    supabase
      .from("ad_data")
      .select("platform, date_start, data")
      .eq("brand_id", brandId)
      .gte("date_start", start)
      .lte("date_start", end),
    supabase
      .from("ad_data")
      .select("platform, date_start, data")
      .eq("brand_id", brandId)
      .gte("date_start", priorStart)
      .lte("date_start", priorEnd),
    supabase.from("client_budgets").select("*").eq("brand_id", brandId).maybeSingle(),
    supabase
      .from("brand_ad_accounts")
      .select("platform")
      .eq("brand_id", brandId)
      .eq("is_active", true),
    supabase
      .from("chart_annotations")
      .select("id, anchor_date, body, created_at, users(full_name)")
      .eq("brand_id", brandId)
      .gte("anchor_date", start)
      .lte("anchor_date", end)
      .order("anchor_date", { ascending: true }),
  ]);

  const currTotals = summarize(aggregateAdData(currRows ?? [], "campaign"));
  const priorTotals = summarize(aggregateAdData(priorRows ?? [], "campaign"));

  // Daily series
  const dailyMap = new Map<string, { spend: number; revenue: number }>();
  for (const r of currRows ?? []) {
    const d = (r.data as Record<string, unknown>) ?? {};
    const date = r.date_start as string;
    const ex = dailyMap.get(date) ?? { spend: 0, revenue: 0 };
    ex.spend += Number(d.spend ?? d.cost ?? 0);
    ex.revenue += Number(d.purchase_value ?? d.conversion_value ?? d.revenue ?? 0);
    dailyMap.set(date, ex);
  }
  const daily: DailyPoint[] = [...dailyMap.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const priorDailyMap = new Map<string, { spend: number; revenue: number }>();
  for (const r of priorRows ?? []) {
    const d = (r.data as Record<string, unknown>) ?? {};
    const date = r.date_start as string;
    const ex = priorDailyMap.get(date) ?? { spend: 0, revenue: 0 };
    ex.spend += Number(d.spend ?? d.cost ?? 0);
    ex.revenue += Number(d.purchase_value ?? d.conversion_value ?? d.revenue ?? 0);
    priorDailyMap.set(date, ex);
  }
  const priorDaily: DailyPoint[] = [...priorDailyMap.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Per-platform breakdown
  const connectedSet = new Set<string>((connections ?? []).map((c) => c.platform as string));
  const byPlatform: PlatformBreakdown[] = (Object.keys(PLATFORM_GROUPS) as ConnectedPlatform[]).map((p) => {
    const dbValues = PLATFORM_GROUPS[p];
    const platformRows = (currRows ?? []).filter((r) => dbValues.includes(r.platform as string));
    const totals = summarize(aggregateAdData(platformRows as { platform: string; date_start: string; data: Json }[], "campaign"));
    const connected = dbValues.some((v) => connectedSet.has(v));
    return {
      platform: p,
      connected,
      spend: totals.spend,
      conversions: totals.conversions,
      roas: totals.roas,
    };
  });

  // Top campaigns (across all platforms)
  const allCampaigns = aggregateAdData(currRows ?? [], "campaign");
  const topCampaigns = allCampaigns.slice(0, 10);
  const bestCampaign =
    [...allCampaigns].filter((r) => r.spend > 0 && r.roas > 0).sort((a, b) => b.roas - a.roas)[0] ?? null;

  const annotationItems: AnnotationItem[] = (annotations ?? []).map((a) => {
    const u = (a as { users?: { full_name?: string } | null }).users;
    return {
      id: a.id as string,
      anchor_date: a.anchor_date as string,
      body: a.body as string,
      created_at: a.created_at as string,
      author_name: u?.full_name ?? null,
    };
  });

  return {
    brand: { id: brandId, name: brand.name as string },
    annotations: annotationItems,
    range: { start, end, days },
    current: {
      spend: currTotals.spend,
      revenue: 0, // computed below from daily map
      roas: currTotals.roas,
      conversions: currTotals.conversions,
      impressions: currTotals.impressions,
      clicks: currTotals.clicks,
      ctr: currTotals.ctr,
      cpa: currTotals.cpa,
    },
    deltas: {
      spend: deltaPct(currTotals.spend, priorTotals.spend),
      revenue: 0,
      roas: deltaPct(currTotals.roas, priorTotals.roas),
      conversions: deltaPct(currTotals.conversions, priorTotals.conversions),
      impressions: deltaPct(currTotals.impressions, priorTotals.impressions),
      clicks: deltaPct(currTotals.clicks, priorTotals.clicks),
      ctr: deltaPct(currTotals.ctr, priorTotals.ctr),
      cpa: deltaPct(currTotals.cpa, priorTotals.cpa),
    },
    daily,
    priorDaily,
    byPlatform,
    topCampaigns,
    bestCampaign,
    budget: {
      currentBalance: Number(budget?.current_balance_myr ?? 0),
      totalTopup: Number(budget?.total_topup_myr ?? 0),
      totalSpent: Number(budget?.total_spent_myr ?? 0),
    },
  };
}

// Compute revenue separately so the OverviewData object stays clean
export function withRevenueTotals(o: OverviewData): OverviewData {
  const currRevenue = o.daily.reduce((s, d) => s + d.revenue, 0);
  const priorRevenue = o.priorDaily.reduce((s, d) => s + d.revenue, 0);
  return {
    ...o,
    current: { ...o.current, revenue: currRevenue },
    deltas: { ...o.deltas, revenue: deltaPct(currRevenue, priorRevenue) },
  };
}
