import { createClient } from "@/lib/supabase/server";
import { aggregateAdData, summarize, type AdLevel } from "./aggregate";

interface RawRow { platform: string; date_start: string; data: import("@/lib/supabase/types").Json }

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
  adAccountIds?: string[]; // optional filter, empty = all accounts
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
      dailySpendOnly: [] as { date: string; value: number }[],
      dailyClicks: [] as { date: string; value: number }[],
      spendByAccount: [] as { key: string; label: string; value: number }[],
      clicksByAccount: [] as { key: string; label: string; value: number }[],
      annotations: [] as { id: string; anchor_date: string; body: string; created_at: string; author_name: string | null }[],
      range: null,
      adAccountOptions: [] as { platform: string; platformAdAccountId: string; adAccountName: string | null; currency: string | null }[],
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

  const adAccountIds = opts.adAccountIds && opts.adAccountIds.length > 0
    ? opts.adAccountIds
    : null;

  let currQ = supabase
    .from("ad_data")
    .select("platform, platform_ad_account_id, date_start, data")
    .eq("brand_id", brand.id as string)
    .in("platform", opts.platforms)
    .gte("date_start", startIso)
    .lte("date_start", endIso);
  let priorQ = supabase
    .from("ad_data")
    .select("platform, platform_ad_account_id, date_start, data")
    .eq("brand_id", brand.id as string)
    .in("platform", opts.platforms)
    .gte("date_start", priorStart)
    .lte("date_start", priorEnd);
  if (adAccountIds) {
    currQ = currQ.in("platform_ad_account_id", adAccountIds);
    priorQ = priorQ.in("platform_ad_account_id", adAccountIds);
  }

  const [{ data: currData }, { data: priorData }, { data: annotations }] = await Promise.all([
    currQ,
    priorQ,
    supabase
      .from("chart_annotations")
      .select("id, anchor_date, body, created_at, users(full_name)")
      .eq("brand_id", brand.id as string)
      .gte("anchor_date", startIso)
      .lte("anchor_date", endIso)
      .order("anchor_date", { ascending: true }),
  ]);

  // Pull discovered Ad Accounts so the platform page can render the filter chip
  const { data: adAccounts } = await supabase
    .from("brand_platform_ad_accounts")
    .select("platform, platform_ad_account_id, ad_account_name, currency")
    .eq("brand_id", brand.id as string)
    .in("platform", opts.platforms)
    .order("ad_account_name", { ascending: true });
  const adAccountOptions = (adAccounts ?? []).map((a) => ({
    platform: a.platform as string,
    platformAdAccountId: a.platform_ad_account_id as string,
    adAccountName: (a.ad_account_name as string) ?? null,
    currency: (a.currency as string) ?? null,
  }));

  const rows = aggregateAdData(currData ?? [], opts.level);
  const totals = summarize(rows);
  const priorRows = aggregateAdData(priorData ?? [], opts.level);
  const priorTotals = summarize(priorRows);

  // Spend distribution by Meta Ad Account (the chip surfaces this too —
  // donut visualizes share). Map ad_account_id → display name via the
  // brand_platform_ad_accounts cache.
  const accountNameById = new Map(adAccountOptions.map((a) => [a.platformAdAccountId, a.adAccountName ?? a.platformAdAccountId]));
  const spendByAccountMap = new Map<string, number>();
  const clicksByAccountMap = new Map<string, number>();
  for (const r of (currData ?? []) as Array<RawRow & { platform_ad_account_id?: string | null }>) {
    const acct = (r.platform_ad_account_id as string | null) ?? "unknown";
    const d = (r.data as Record<string, unknown>) ?? {};
    const spend = Number(d.spend ?? d.cost ?? 0);
    const clicks = Number(d.clicks ?? d.link_clicks ?? d.inline_link_clicks ?? d.outbound_clicks ?? 0);
    spendByAccountMap.set(acct, (spendByAccountMap.get(acct) ?? 0) + spend);
    clicksByAccountMap.set(acct, (clicksByAccountMap.get(acct) ?? 0) + clicks);
  }
  const spendByAccount = [...spendByAccountMap.entries()]
    .map(([key, value]) => ({
      key,
      label: accountNameById.get(key) ?? key,
      value,
    }))
    .sort((a, b) => b.value - a.value);
  const clicksByAccount = [...clicksByAccountMap.entries()]
    .map(([key, value]) => ({
      key,
      label: accountNameById.get(key) ?? key,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  // Daily series (single-metric trend cards in the story row use this too)
  const buildDailySpend = (rs: typeof currData) => {
    const m = new Map<string, number>();
    for (const r of rs ?? []) {
      const d = (r.data as Record<string, unknown>) ?? {};
      const date = r.date_start as string;
      m.set(date, (m.get(date) ?? 0) + Number(d.spend ?? d.cost ?? 0));
    }
    return [...m.entries()]
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };
  const buildDailyClicks = (rs: typeof currData) => {
    const m = new Map<string, number>();
    for (const r of rs ?? []) {
      const d = (r.data as Record<string, unknown>) ?? {};
      const date = r.date_start as string;
      const clicks = Number(d.clicks ?? d.link_clicks ?? d.inline_link_clicks ?? d.outbound_clicks ?? 0);
      m.set(date, (m.get(date) ?? 0) + clicks);
    }
    return [...m.entries()]
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };
  const dailySpendOnly = buildDailySpend(currData);
  const dailyClicks = buildDailyClicks(currData);

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
    dailySpendOnly,
    dailyClicks,
    spendByAccount,
    clicksByAccount,
    annotations: annotationItems,
    range: { start: startIso, end: endIso, days },
    adAccountOptions,
  };
}
