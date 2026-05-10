import { createClient } from "@/lib/supabase/server";
import { aggregateAdData, summarize, type AdLevel } from "./aggregate";

interface DailyPoint {
  date: string;
  spend: number;
  revenue: number;
}

function isoMinusDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function deltaPct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

/**
 * Shared loader for the per-platform pages on the client portal.
 * Returns the assigned brand + aggregated rows for the level over the
 * given date range (defaults: last 30 days), plus prior-period totals
 * and daily series for comparison charts.
 */
export async function loadBrandLevelData(opts: {
  userId: string;
  platforms: string[];
  level: AdLevel;
  start?: string;
  end?: string;
}) {
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("assigned_client_user_id", opts.userId)
    .maybeSingle();

  if (!brand) {
    return {
      brand: null,
      rows: [],
      totals: null,
      priorTotals: null,
      deltas: null,
      daily: [] as DailyPoint[],
      priorDaily: [] as DailyPoint[],
      annotations: [] as { id: string; anchor_date: string; body: string; created_at: string; author_name: string | null }[],
      range: null,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const defaultStart = isoMinusDays(today, 30);
  const startIso = opts.start ?? defaultStart;
  const endIso = opts.end ?? today;

  const days = Math.max(
    1,
    Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 86_400_000) + 1
  );
  const priorEnd = isoMinusDays(startIso, 1);
  const priorStart = isoMinusDays(priorEnd, days - 1);

  const [{ data: currData }, { data: priorData }, { data: annotations }] = await Promise.all([
    supabase
      .from("ad_data")
      .select("platform, date_start, data")
      .eq("brand_id", brand.id as string)
      .in("platform", opts.platforms)
      .gte("date_start", startIso)
      .lte("date_start", endIso),
    supabase
      .from("ad_data")
      .select("platform, date_start, data")
      .eq("brand_id", brand.id as string)
      .in("platform", opts.platforms)
      .gte("date_start", priorStart)
      .lte("date_start", priorEnd),
    supabase
      .from("chart_annotations")
      .select("id, anchor_date, body, created_at, users(full_name)")
      .eq("brand_id", brand.id as string)
      .gte("anchor_date", startIso)
      .lte("anchor_date", endIso)
      .order("anchor_date", { ascending: true }),
  ]);

  const rows = aggregateAdData(currData ?? [], opts.level);
  const totals = summarize(rows);
  const priorRows = aggregateAdData(priorData ?? [], opts.level);
  const priorTotals = summarize(priorRows);

  // Daily series for chart
  const buildDaily = (rows: typeof currData): DailyPoint[] => {
    const m = new Map<string, { spend: number; revenue: number }>();
    for (const r of rows ?? []) {
      const d = (r.data as Record<string, unknown>) ?? {};
      const date = r.date_start as string;
      const ex = m.get(date) ?? { spend: 0, revenue: 0 };
      ex.spend += Number(d.spend ?? d.cost ?? 0);
      ex.revenue += Number(d.purchase_value ?? d.conversion_value ?? d.revenue ?? 0);
      m.set(date, ex);
    }
    return [...m.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const daily = buildDaily(currData);
  const priorDaily = buildDaily(priorData);

  const deltas = {
    spend: deltaPct(totals.spend, priorTotals.spend),
    revenue: deltaPct(totals.revenue, priorTotals.revenue),
    impressions: deltaPct(totals.impressions, priorTotals.impressions),
    clicks: deltaPct(totals.clicks, priorTotals.clicks),
    conversions: deltaPct(totals.conversions, priorTotals.conversions),
    ctr: deltaPct(totals.ctr, priorTotals.ctr),
    cpa: deltaPct(totals.cpa, priorTotals.cpa),
    roas: deltaPct(totals.roas, priorTotals.roas),
    cpc: deltaPct(totals.cpc, priorTotals.cpc),
    cpm: deltaPct(totals.cpm, priorTotals.cpm),
  };

  const annotationItems = (annotations ?? []).map((a) => {
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
    brand: { id: brand.id as string, name: brand.name as string },
    rows,
    totals,
    priorTotals,
    deltas,
    daily,
    priorDaily,
    annotations: annotationItems,
    range: { start: startIso, end: endIso, days },
  };
}
