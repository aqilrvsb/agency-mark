import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Seeds ~30 days of realistic-looking ad_data rows for demo / sales
 * pitches. Generates per-brand × per-platform × per-day rows with
 * synthetic spend / impressions / clicks / conversions / revenue
 * that show realistic volatility.
 *
 * GET /api/admin/seed-demo?brand_id=<uuid>&days=30
 * Auth: Authorization: Bearer ${CRON_SECRET}
 *
 * Idempotent: clears existing ad_data for the brand in the same window
 * before inserting. Safe to re-run.
 */

interface CampaignSpec {
  id: string;
  name: string;
  platform: "meta_ads" | "google_ads" | "tiktok_ads";
  // base values per day
  baseSpend: number;
  baseCtr: number;
  baseCvr: number;
  baseAov: number;
  status: "ACTIVE" | "PAUSED";
}

const DEMO_CAMPAIGNS: CampaignSpec[] = [
  {
    id: "demo-fb-ramadan",
    name: "Ramadan Push 2026",
    platform: "meta_ads",
    baseSpend: 380,
    baseCtr: 0.018,
    baseCvr: 0.045,
    baseAov: 280,
    status: "ACTIVE",
  },
  {
    id: "demo-fb-retarget",
    name: "FB Retargeting — Cart Abandoners",
    platform: "meta_ads",
    baseSpend: 220,
    baseCtr: 0.025,
    baseCvr: 0.072,
    baseAov: 320,
    status: "ACTIVE",
  },
  {
    id: "demo-fb-prospect",
    name: "FB Prospecting — Lookalike 1%",
    platform: "meta_ads",
    baseSpend: 280,
    baseCtr: 0.012,
    baseCvr: 0.025,
    baseAov: 240,
    status: "ACTIVE",
  },
  {
    id: "demo-fb-promo-may",
    name: "Promo May (paused — high CPA)",
    platform: "meta_ads",
    baseSpend: 50,
    baseCtr: 0.008,
    baseCvr: 0.012,
    baseAov: 180,
    status: "PAUSED",
  },
  {
    id: "demo-google-search-brand",
    name: "Search — Brand Terms",
    platform: "google_ads",
    baseSpend: 180,
    baseCtr: 0.092,
    baseCvr: 0.085,
    baseAov: 350,
    status: "ACTIVE",
  },
  {
    id: "demo-google-shopping",
    name: "Shopping — All Products",
    platform: "google_ads",
    baseSpend: 240,
    baseCtr: 0.035,
    baseCvr: 0.038,
    baseAov: 290,
    status: "ACTIVE",
  },
  {
    id: "demo-tt-ugc-spark",
    name: "TT Spark Ads — UGC Creators",
    platform: "tiktok_ads",
    baseSpend: 320,
    baseCtr: 0.022,
    baseCvr: 0.032,
    baseAov: 220,
    status: "ACTIVE",
  },
  {
    id: "demo-tt-promo-shop",
    name: "TT Promo Shop Tab",
    platform: "tiktok_ads",
    baseSpend: 140,
    baseCtr: 0.015,
    baseCvr: 0.028,
    baseAov: 195,
    status: "ACTIVE",
  },
];

function jitter(value: number, factor = 0.25): number {
  // Returns value * (1 ± factor), bell-ish via two random draws
  const r = Math.random() + Math.random() - 1; // [-1, 1] roughly normal
  return Math.max(0, value * (1 + r * factor));
}

function isoMinusDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const brandId = url.searchParams.get("brand_id");
  const days = Math.min(60, Math.max(7, Number(url.searchParams.get("days") ?? 30)));
  if (!brandId) {
    return NextResponse.json({ error: "brand_id required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: brand } = await admin
    .from("brands")
    .select("id, company_id")
    .eq("id", brandId)
    .maybeSingle();
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }
  const companyId = brand.company_id as string;

  const today = new Date().toISOString().slice(0, 10);
  const start = isoMinusDays(today, days - 1);

  // Wipe existing demo rows in the window so re-runs stay clean
  await admin
    .from("ad_data")
    .delete()
    .eq("brand_id", brandId)
    .gte("date_start", start)
    .lte("date_start", today);

  // Generate rows
  type Row = {
    company_id: string;
    brand_id: string;
    platform: string;
    date_start: string;
    date_end: string;
    data: Record<string, unknown>;
  };
  const rows: Row[] = [];
  for (let dayIdx = 0; dayIdx < days; dayIdx++) {
    const date = isoMinusDays(today, days - 1 - dayIdx);
    // Day-of-week bias: weekdays slightly higher spend
    const dow = new Date(date).getDay();
    const dowMult = dow >= 1 && dow <= 5 ? 1.0 : 0.78;
    // Trend: slight growth over the period
    const trendMult = 1 + (dayIdx / days) * 0.18;

    for (const c of DEMO_CAMPAIGNS) {
      // Paused campaigns: only 1/3 of days have spend, all minimal
      if (c.status === "PAUSED" && Math.random() > 0.33) continue;

      const spend = jitter(c.baseSpend * dowMult * trendMult, 0.22);
      const cpc = jitter(0.85, 0.3);
      const clicks = Math.max(1, Math.round(spend / cpc));
      const ctr = jitter(c.baseCtr, 0.18);
      const impressions = Math.max(clicks, Math.round(clicks / ctr));
      const conversions = Math.max(0, Math.round(clicks * jitter(c.baseCvr, 0.25)));
      const aov = jitter(c.baseAov, 0.15);
      const revenue = conversions * aov;

      rows.push({
        company_id: companyId,
        brand_id: brandId,
        platform: c.platform,
        date_start: date,
        date_end: date,
        data: {
          campaign_id: c.id,
          campaign_name: c.name,
          status: c.status,
          objective: c.platform === "google_ads" ? "Search" : "Conversions",
          spend: Number(spend.toFixed(2)),
          impressions,
          clicks,
          conversions,
          purchase_value: Number(revenue.toFixed(2)),
        },
      });
    }
  }

  // Insert in batches of 500
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const slice = rows.slice(i, i + 500);
    const { error } = await admin.from("ad_data").insert(
      slice.map((r) => ({
        ...r,
        data: r.data as unknown as import("@/lib/supabase/types").Json,
      }))
    );
    if (error) {
      return NextResponse.json({ error: error.message, inserted }, { status: 500 });
    }
    inserted += slice.length;
  }

  // Also ensure a budget topup exists so the goal pacing bar shows
  const { data: existing } = await admin
    .from("client_budgets")
    .select("id")
    .eq("brand_id", brandId)
    .maybeSingle();
  if (!existing) {
    await admin.from("client_budgets").insert({
      brand_id: brandId,
      company_id: companyId,
      current_balance_myr: 8000,
      total_topup_myr: 25000,
      total_spent_myr: 17000,
    });
  }

  return NextResponse.json({
    ok: true,
    brand_id: brandId,
    days,
    rows_inserted: inserted,
    period: { start, end: today },
  });
}

export async function POST(req: Request) {
  return GET(req);
}
