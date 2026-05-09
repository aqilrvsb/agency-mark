import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { getZernio } from "./client";

export type Platform = "meta_ads" | "tiktok_ads" | "meta_insights";

/**
 * Sync one agency's connected ad accounts from Zernio → Supabase ad_data.
 *
 * Architecture:
 *   - One master Zernio account (master admin's API key in env)
 *   - Each agency's clients have ad accounts connected via OAuth → linked to brand_ad_accounts
 *   - This worker iterates brand_ad_accounts for the agency and pulls last 2 days
 *     of analytics for each, upserting into ad_data.
 */
export async function syncAgency(companyId: string): Promise<{
  ok: boolean;
  rows: { meta_ads: number; tiktok_ads: number; meta_insights: number };
  errors: string[];
}> {
  const admin = createAdminClient();
  const zernio = getZernio();
  const errors: string[] = [];
  const rows = { meta_ads: 0, tiktok_ads: 0, meta_insights: 0 };

  // 1. Look up brand → ad account mappings for this agency
  const { data: adAccounts } = await admin
    .from("brand_ad_accounts")
    .select("id, brand_id, platform, external_account_id")
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (!adAccounts || adAccounts.length === 0) {
    return { ok: false, rows, errors: ["No active ad accounts mapped"] };
  }

  // 2. Determine date window: last 2 days
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 2);
  const dateStart = start.toISOString().slice(0, 10);
  const dateEnd = today.toISOString().slice(0, 10);

  // 3. Fetch + upsert per ad account
  for (const acc of adAccounts) {
    const platform = (acc.platform as string) as Platform;
    if (!["meta_ads", "tiktok_ads", "meta_insights", "meta", "tiktok"].includes(platform)) continue;

    // Map legacy values to new
    const normalizedPlatform: Platform =
      platform === "meta" || platform === "meta_ads" ? "meta_ads"
      : platform === "tiktok" || platform === "tiktok_ads" ? "tiktok_ads"
      : "meta_insights";

    try {
      const analytics = await zernio.getAdAnalytics({
        accountId: acc.external_account_id,
        platform: normalizedPlatform,
        dateStart,
        dateEnd,
      });

      if (!analytics || analytics.length === 0) continue;

      const inserts = analytics.map((r) => ({
        company_id: companyId,
        brand_id: acc.brand_id,
        platform: normalizedPlatform,
        date_start: r.date,
        date_end: r.date,
        data: r as unknown as Json,
      }));

      const { error: insErr } = await admin.from("ad_data").insert(inserts);
      if (insErr) {
        errors.push(`${normalizedPlatform}/${acc.external_account_id}: ${insErr.message}`);
        continue;
      }
      rows[normalizedPlatform] += inserts.length;
    } catch (e) {
      errors.push(`${normalizedPlatform}/${acc.external_account_id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 4. Log sync result (use existing adzviser_sync_logs table — naming is legacy)
  const totalRows = rows.meta_ads + rows.tiktok_ads + rows.meta_insights;
  await admin.from("adzviser_sync_logs").insert({
    company_id: companyId,
    platform: "meta_ads",
    status: errors.length === 0 ? "success" : (totalRows > 0 ? "partial" : "failed"),
    rows_fetched: totalRows,
    error_message: errors.join("; ") || null,
  });

  // 5. Update last_synced_at on the agency's connection record (if exists)
  await admin.from("adzviser_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("company_id", companyId);

  return { ok: errors.length === 0, rows, errors };
}

/**
 * Sync ALL active agencies. Called by cron.
 */
export async function syncAllAgencies() {
  const admin = createAdminClient();
  // Sync any agency that has at least one ad account mapped
  const { data: agencies } = await admin
    .from("brand_ad_accounts")
    .select("company_id")
    .eq("is_active", true);

  if (!agencies) return { synced: 0, results: [] };

  const uniqueCompanyIds = [...new Set(agencies.map((a) => a.company_id as string))];
  const results = await Promise.all(uniqueCompanyIds.map((id) => syncAgency(id)));

  return {
    synced: results.filter((r) => r.ok).length,
    results,
  };
}
