import { createClient } from "@/lib/supabase/server";

export type BrandStatus = "healthy" | "warn" | "alert" | "no_data";

export interface BrandTile {
  id: string;
  name: string;
  status: BrandStatus;
  statusReason: string;
  spend: number;
  spendDelta: number;
  roas: number;
  roasDelta: number;
  conversions: number;
  conversionsDelta: number;
  platforms: string[]; // unique normalized platforms connected
  unreadAlerts: number;
  spark: number[]; // last N daily spend values (oldest → newest)
}

export interface DashboardData {
  brands: BrandTile[];
  totals: {
    spend: number;
    spendDelta: number;
    revenue: number;
    revenueDelta: number;
    conversions: number;
    conversionsDelta: number;
    roas: number;
    roasDelta: number;
    activeBrands: number;
    totalBrands: number;
  };
  unreadAlerts: number;
  range: { start: string; end: string; days: number };
}

const PLATFORM_NORMALIZE: Record<string, string> = {
  meta: "facebook",
  meta_ads: "facebook",
  meta_insights: "facebook",
  google_ads: "google",
  tiktok: "tiktok",
  tiktok_ads: "tiktok",
};

function deltaPct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function isoMinusDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function loadDashboardData(opts: { companyId: string; days?: number }): Promise<DashboardData> {
  const supabase = await createClient();
  const days = opts.days ?? 7;

  const today = new Date().toISOString().slice(0, 10);
  const start = isoMinusDays(today, days - 1);
  const priorEnd = isoMinusDays(start, 1);
  const priorStart = isoMinusDays(priorEnd, days - 1);

  const [brandsRes, currRes, priorRes, accountsRes, alertsRes] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name, is_active")
      .eq("company_id", opts.companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("ad_data")
      .select("brand_id, platform, date_start, data")
      .eq("company_id", opts.companyId)
      .gte("date_start", start)
      .lte("date_start", today),
    supabase
      .from("ad_data")
      .select("brand_id, platform, date_start, data")
      .eq("company_id", opts.companyId)
      .gte("date_start", priorStart)
      .lte("date_start", priorEnd),
    supabase
      .from("brand_ad_accounts")
      .select("brand_id, platform")
      .eq("company_id", opts.companyId)
      .eq("is_active", true),
    supabase
      .from("alert_history")
      .select("id, marketer_id")
      .eq("company_id", opts.companyId)
      .eq("is_read", false),
  ]);

  type AdRow = { brand_id: string; platform: string; date_start: string; data: Record<string, unknown> };
  const aggBrand = (rows: AdRow[]) => {
    const m = new Map<string, { spend: number; revenue: number; conversions: number }>();
    for (const r of rows) {
      const id = r.brand_id;
      const ex = m.get(id) ?? { spend: 0, revenue: 0, conversions: 0 };
      const d = r.data ?? {};
      ex.spend += Number(d.spend ?? d.cost ?? 0);
      ex.revenue += Number(d.purchase_value ?? d.conversion_value ?? d.revenue ?? 0);
      ex.conversions += Number(
        d.conversions ?? d.results ?? d.purchases ?? d.leads ?? 0
      );
      m.set(id, ex);
    }
    return m;
  };

  const currByBrand = aggBrand((currRes.data ?? []) as unknown as AdRow[]);
  const priorByBrand = aggBrand((priorRes.data ?? []) as unknown as AdRow[]);

  // Per-brand daily spend for sparklines
  const sparkByBrand = new Map<string, Map<string, number>>();
  for (const r of (currRes.data ?? []) as unknown as AdRow[]) {
    const id = r.brand_id;
    const date = r.date_start;
    const d = r.data ?? {};
    const spend = Number(d.spend ?? d.cost ?? 0);
    let dayMap = sparkByBrand.get(id);
    if (!dayMap) {
      dayMap = new Map();
      sparkByBrand.set(id, dayMap);
    }
    dayMap.set(date, (dayMap.get(date) ?? 0) + spend);
  }
  // Build a complete day list for the window (so missing days show as 0 in the spark)
  const dayList: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dayList.push(isoMinusDays(today, i));
  }

  // platforms by brand
  const platformsByBrand = new Map<string, Set<string>>();
  for (const a of accountsRes.data ?? []) {
    const id = a.brand_id as string;
    const norm = PLATFORM_NORMALIZE[a.platform as string] ?? (a.platform as string);
    const set = platformsByBrand.get(id) ?? new Set<string>();
    set.add(norm);
    platformsByBrand.set(id, set);
  }

  const tiles: BrandTile[] = (brandsRes.data ?? []).map((b) => {
    const id = b.id as string;
    const curr = currByBrand.get(id) ?? { spend: 0, revenue: 0, conversions: 0 };
    const prior = priorByBrand.get(id) ?? { spend: 0, revenue: 0, conversions: 0 };
    const roas = curr.spend > 0 ? curr.revenue / curr.spend : 0;
    const priorRoas = prior.spend > 0 ? prior.revenue / prior.spend : 0;

    let status: BrandStatus;
    let statusReason: string;
    if (curr.spend === 0) {
      status = "no_data";
      statusReason = "No spend in the last 7 days";
    } else if (roas > 0 && roas < 1) {
      status = "alert";
      statusReason = `ROAS below 1× (${roas.toFixed(2)}×)`;
    } else if (deltaPct(curr.spend, prior.spend) < -25) {
      status = "warn";
      statusReason = "Spend dropped >25% vs prev week";
    } else if (priorRoas > 0 && deltaPct(roas, priorRoas) < -20) {
      status = "warn";
      statusReason = "ROAS dropped >20% vs prev week";
    } else {
      status = "healthy";
      statusReason = "Performing well";
    }

    const dayMap = sparkByBrand.get(id) ?? new Map<string, number>();
    const spark = dayList.map((d) => dayMap.get(d) ?? 0);

    return {
      id,
      name: b.name as string,
      status,
      statusReason,
      spend: curr.spend,
      spendDelta: deltaPct(curr.spend, prior.spend),
      roas,
      roasDelta: deltaPct(roas, priorRoas),
      conversions: curr.conversions,
      conversionsDelta: deltaPct(curr.conversions, prior.conversions),
      platforms: [...(platformsByBrand.get(id) ?? [])],
      unreadAlerts: 0,
      spark,
    };
  });

  // sort: alerts/warn first, then by spend desc
  tiles.sort((a, b) => {
    const order = { alert: 0, warn: 1, healthy: 2, no_data: 3 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return b.spend - a.spend;
  });

  // Totals
  const totalSpend = [...currByBrand.values()].reduce((s, v) => s + v.spend, 0);
  const totalRevenue = [...currByBrand.values()].reduce((s, v) => s + v.revenue, 0);
  const totalConversions = [...currByBrand.values()].reduce((s, v) => s + v.conversions, 0);
  const priorSpend = [...priorByBrand.values()].reduce((s, v) => s + v.spend, 0);
  const priorRevenue = [...priorByBrand.values()].reduce((s, v) => s + v.revenue, 0);
  const priorConversions = [...priorByBrand.values()].reduce((s, v) => s + v.conversions, 0);
  const totalRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const priorRoasTotal = priorSpend > 0 ? priorRevenue / priorSpend : 0;

  return {
    brands: tiles,
    totals: {
      spend: totalSpend,
      spendDelta: deltaPct(totalSpend, priorSpend),
      revenue: totalRevenue,
      revenueDelta: deltaPct(totalRevenue, priorRevenue),
      conversions: totalConversions,
      conversionsDelta: deltaPct(totalConversions, priorConversions),
      roas: totalRoas,
      roasDelta: deltaPct(totalRoas, priorRoasTotal),
      activeBrands: (brandsRes.data ?? []).filter((b) => b.is_active).length,
      totalBrands: (brandsRes.data ?? []).length,
    },
    unreadAlerts: alertsRes.data?.length ?? 0,
    range: { start, end: today, days },
  };
}
