import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsApp, buildDailyDigest } from "@/lib/whatsapp/send";

/**
 * Daily WhatsApp digest. For each brand whose assigned client user has
 * a whatsapp_number, sends yesterday's spend / conversions / ROAS via
 * WhatsApp at the agency's configured 9 AM Malaysia time.
 *
 * Schedule: vercel.json cron "0 1 * * *" (1 AM UTC = 9 AM MYT).
 * Auth: Authorization: Bearer ${CRON_SECRET}.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  // Brands with an assigned client user
  const { data: brands } = await admin
    .from("brands")
    .select("id, name, company_id, assigned_client_user_id")
    .eq("is_active", true)
    .not("assigned_client_user_id", "is", null);

  if (!brands || brands.length === 0) {
    return NextResponse.json({ scanned: 0, sent: 0, skipped: 0, errors: [] });
  }

  const userIds = [...new Set(brands.map((b) => b.assigned_client_user_id as string))];
  const companyIds = [...new Set(brands.map((b) => b.company_id as string))];

  const [{ data: users }, { data: companies }] = await Promise.all([
    admin.from("users").select("id, full_name, whatsapp_number").in("id", userIds),
    admin.from("companies").select("id, name").in("id", companyIds),
  ]);
  const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));
  const companyMap = new Map((companies ?? []).map((c) => [c.id as string, c.name as string]));

  // Yesterday's ad_data for all relevant brands
  const brandIds = brands.map((b) => b.id as string);
  const { data: rows } = await admin
    .from("ad_data")
    .select("brand_id, data")
    .in("brand_id", brandIds)
    .eq("date_start", yesterday);

  const yesterdayByBrand = new Map<string, { spend: number; revenue: number; conversions: number }>();
  for (const r of rows ?? []) {
    const id = r.brand_id as string;
    const d = (r.data as Record<string, unknown>) ?? {};
    const ex = yesterdayByBrand.get(id) ?? { spend: 0, revenue: 0, conversions: 0 };
    ex.spend += Number(d.spend ?? d.cost ?? 0);
    ex.revenue += Number(d.purchase_value ?? d.conversion_value ?? d.revenue ?? 0);
    ex.conversions += Number(d.conversions ?? d.results ?? d.purchases ?? d.leads ?? 0);
    yesterdayByBrand.set(id, ex);
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];
  const dashboardOrigin =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://agency-mark.vercel.app";

  for (const brand of brands) {
    const user = userMap.get(brand.assigned_client_user_id as string);
    if (!user?.whatsapp_number) {
      skipped++;
      continue;
    }
    const stats = yesterdayByBrand.get(brand.id as string) ?? { spend: 0, revenue: 0, conversions: 0 };
    const roas = stats.spend > 0 ? stats.revenue / stats.spend : 0;
    const agencyName = companyMap.get(brand.company_id as string) ?? "your agency";

    const body = buildDailyDigest({
      brandName: brand.name as string,
      agencyName,
      spend: stats.spend,
      conversions: stats.conversions,
      roas,
      dashboardUrl: `${dashboardOrigin}/client/overview`,
      language: "ms",
    });

    const result = await sendWhatsApp({ to: user.whatsapp_number as string, body });
    if (result.ok) {
      sent++;
    } else if (result.skipped) {
      skipped++;
    } else if (result.error) {
      errors.push(`${brand.id}: ${result.error}`);
    }

    // Rate-limit: 1 msg/sec to be safe across providers
    if (sent > 0 && sent % 5 === 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return NextResponse.json({
    scanned: brands.length,
    sent,
    skipped,
    errors,
    dateSent: yesterday,
  });
}

export async function GET(req: Request) {
  return POST(req);
}
