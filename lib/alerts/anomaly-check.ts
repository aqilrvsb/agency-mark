import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsApp } from "@/lib/whatsapp/send";

interface AnomalyResult {
  brandsScanned: number;
  alertsCreated: number;
  notificationsCreated: number;
  whatsappSent: number;
  errors: string[];
}

/**
 * Nightly anomaly detector. For each active brand:
 *   - Last-24h spend  vs trailing 7-day daily average → flag if >50% over.
 *   - Last-24h ROAS                                   → flag if <1× and meaningful spend.
 *   - Last-24h CPA    vs trailing 7-day average       → flag if >50% over (and last-24h has conversions).
 *
 * Each fired anomaly:
 *   - inserts a row in alert_history with severity (warning|critical)
 *   - inserts notifications rows for all BOD/Leader users in the agency
 */
export async function runAnomalyCheck(): Promise<AnomalyResult> {
  const admin = createAdminClient();
  const errors: string[] = [];
  let alertsCreated = 0;
  let notificationsCreated = 0;
  let whatsappSent = 0;

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = yesterday.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString().slice(0, 10);

  // Get all active brands with at least one connected ad account
  const { data: brands } = await admin
    .from("brands")
    .select("id, name, company_id")
    .eq("is_active", true);

  if (!brands || brands.length === 0) {
    return { brandsScanned: 0, alertsCreated: 0, notificationsCreated: 0, errors: [] };
  }

  // Bulk-fetch ad_data for last 7 days
  const brandIds = brands.map((b) => b.id as string);
  const { data: rows } = await admin
    .from("ad_data")
    .select("brand_id, date_start, data")
    .in("brand_id", brandIds)
    .gte("date_start", sevenDaysAgoIso);

  // Index by brand
  const byBrand = new Map<string, { date: string; spend: number; revenue: number; conversions: number }[]>();
  for (const r of rows ?? []) {
    const d = (r.data as Record<string, unknown>) ?? {};
    const id = r.brand_id as string;
    const list = byBrand.get(id) ?? [];
    list.push({
      date: r.date_start as string,
      spend: Number(d.spend ?? d.cost ?? 0),
      revenue: Number(d.purchase_value ?? d.conversion_value ?? d.revenue ?? 0),
      conversions: Number(d.conversions ?? d.results ?? d.purchases ?? d.leads ?? 0),
    });
    byBrand.set(id, list);
  }

  // Pre-fetch BOD/Leader users for each company so we can fan-out notifications
  const companyIds = [...new Set(brands.map((b) => b.company_id as string))];
  const { data: staffUsers } = await admin
    .from("users")
    .select("id, company_id, role, full_name, whatsapp_number")
    .in("company_id", companyIds)
    .in("role", ["bod", "leader"]);
  interface StaffMember {
    id: string;
    name: string | null;
    whatsapp: string | null;
  }
  const staffByCompany = new Map<string, StaffMember[]>();
  for (const u of staffUsers ?? []) {
    const list = staffByCompany.get(u.company_id as string) ?? [];
    list.push({
      id: u.id as string,
      name: (u.full_name as string) ?? null,
      whatsapp: (u.whatsapp_number as string) ?? null,
    });
    staffByCompany.set(u.company_id as string, list);
  }

  for (const brand of brands) {
    const id = brand.id as string;
    const companyId = brand.company_id as string;
    const data = byBrand.get(id) ?? [];

    // last 24h = yesterday's row(s)
    const last24 = data.filter((d) => d.date === yesterdayIso || d.date === todayIso);
    if (last24.length === 0) continue; // no data = nothing to alert on

    const last24Spend = last24.reduce((s, d) => s + d.spend, 0);
    const last24Revenue = last24.reduce((s, d) => s + d.revenue, 0);
    const last24Conv = last24.reduce((s, d) => s + d.conversions, 0);
    const last24Roas = last24Spend > 0 ? last24Revenue / last24Spend : 0;
    const last24Cpa = last24Conv > 0 ? last24Spend / last24Conv : 0;

    // Trailing 7d (excluding last 24h) for baselines
    const baseline = data.filter((d) => d.date !== yesterdayIso && d.date !== todayIso);
    const baselineDays = new Set(baseline.map((d) => d.date)).size;
    if (baselineDays < 3) continue; // not enough baseline

    const baselineSpend = baseline.reduce((s, d) => s + d.spend, 0);
    const baselineConv = baseline.reduce((s, d) => s + d.conversions, 0);
    const avgDailySpend = baselineSpend / baselineDays;
    const avgCpa = baselineConv > 0 ? baselineSpend / baselineConv : 0;

    interface Trigger {
      metric: string;
      severity: "warning" | "critical";
      message: string;
      currentValue: number;
      thresholdValue: number;
    }
    const triggers: Trigger[] = [];

    // Rule 1: spend spike (>50% above 7d average) — only if we crossed RM 100/day
    if (avgDailySpend >= 100 && last24Spend > avgDailySpend * 1.5) {
      triggers.push({
        metric: "spend",
        severity: last24Spend > avgDailySpend * 2 ? "critical" : "warning",
        message: `Spend spiked: RM ${last24Spend.toFixed(0)} yesterday vs RM ${avgDailySpend.toFixed(0)}/day avg`,
        currentValue: last24Spend,
        thresholdValue: avgDailySpend * 1.5,
      });
    }

    // Rule 2: ROAS below 1 with meaningful spend
    if (last24Spend >= 200 && last24Roas > 0 && last24Roas < 1) {
      triggers.push({
        metric: "roas",
        severity: "critical",
        message: `ROAS below 1×: ${last24Roas.toFixed(2)}× yesterday on RM ${last24Spend.toFixed(0)} spend`,
        currentValue: last24Roas,
        thresholdValue: 1,
      });
    }

    // Rule 3: CPA spike (>50% above 7d average)
    if (avgCpa > 0 && last24Cpa > avgCpa * 1.5 && last24Conv >= 3) {
      triggers.push({
        metric: "cpa",
        severity: last24Cpa > avgCpa * 2 ? "critical" : "warning",
        message: `CPA spiked: RM ${last24Cpa.toFixed(0)} yesterday vs RM ${avgCpa.toFixed(0)} avg`,
        currentValue: last24Cpa,
        thresholdValue: avgCpa * 1.5,
      });
    }

    if (triggers.length === 0) continue;

    // Insert alert_history rows + notifications
    for (const t of triggers) {
      const { error: alertErr } = await admin.from("alert_history").insert({
        company_id: companyId,
        rule_id: null,
        marketer_id: null,
        campaign_name: brand.name as string,
        metric: t.metric,
        current_value: t.currentValue,
        threshold_value: t.thresholdValue,
        severity: t.severity,
        message: `${brand.name as string}: ${t.message}`,
        is_read: false,
      });
      if (alertErr) {
        errors.push(`alert_history ${id}/${t.metric}: ${alertErr.message}`);
        continue;
      }
      alertsCreated++;

      // Fan-out to BOD/Leader notifications + WhatsApp (if configured)
      const staff = staffByCompany.get(companyId) ?? [];
      if (staff.length > 0) {
        const notifs = staff.map((s) => ({
          user_id: s.id,
          type: "alert",
          title: `${t.severity === "critical" ? "🚨" : "⚠️"} ${brand.name as string}`,
          message: t.message,
          link: `/clients/${id}`,
          is_read: false,
        }));
        const { error: nErr } = await admin.from("notifications").insert(notifs);
        if (nErr) {
          errors.push(`notifications ${id}: ${nErr.message}`);
        } else {
          notificationsCreated += notifs.length;
        }

        // WhatsApp blast — only on critical severity to avoid alert fatigue
        if (t.severity === "critical") {
          for (const s of staff) {
            if (!s.whatsapp) continue;
            const result = await sendWhatsApp({
              to: s.whatsapp,
              body: `🚨 *${brand.name as string}* alert:\n\n${t.message}\n\nView: https://agency-mark.vercel.app/clients/${id}`,
            });
            if (result.ok) whatsappSent++;
            else if (!result.skipped && result.error) {
              errors.push(`whatsapp ${s.id}: ${result.error}`);
            }
          }
        }
      }
    }
  }

  return { brandsScanned: brands.length, alertsCreated, notificationsCreated, whatsappSent, errors };
}
