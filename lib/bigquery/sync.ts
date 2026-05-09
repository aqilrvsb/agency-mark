import { createAdminClient } from "@/lib/supabase/admin";
import { readAdzviserTable } from "./client";

export type Platform = "meta" | "tiktok" | "meta_insights";

/**
 * Sync one agency's BigQuery tables → Supabase ad_data.
 *
 * Architecture:
 *   - Each agency has an Adzviser Workspace
 *   - Workspace is mapped to GCP BigQuery dataset
 *   - Adzviser writes daily snapshots to BQ tables
 *   - This worker reads BQ → upserts into Supabase ad_data table
 */
export async function syncAgency(companyId: string): Promise<{
  ok: boolean;
  rows: { meta: number; tiktok: number; meta_insights: number };
  errors: string[];
}> {
  const admin = createAdminClient();
  const errors: string[] = [];
  const rows = { meta: 0, tiktok: 0, meta_insights: 0 };

  // 1. Look up Adzviser connection (contains BigQuery dataset name in `notes` or `workspace_id`)
  const { data: connection, error: connErr } = await admin
    .from("adzviser_connections")
    .select("id, workspace_id, notes, is_active")
    .eq("company_id", companyId)
    .maybeSingle();

  if (connErr || !connection || !connection.is_active) {
    return { ok: false, rows, errors: ["No active Adzviser connection for this agency"] };
  }

  const dataset = connection.workspace_id;
  if (!dataset) {
    return { ok: false, rows, errors: ["Workspace ID not set on Adzviser connection"] };
  }

  // 2. Look up brand → ad account mapping
  const { data: adAccounts } = await admin
    .from("brand_ad_accounts")
    .select("id, brand_id, platform, external_account_id")
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (!adAccounts || adAccounts.length === 0) {
    return { ok: false, rows, errors: ["No active ad accounts mapped"] };
  }

  // 3. Determine date window: last 2 days (catch up + safety)
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 2);
  const startDate = yesterday.toISOString().slice(0, 10);
  const endDate = today.toISOString().slice(0, 10);

  // 4. Sync each platform
  for (const platform of ["meta", "tiktok", "meta_insights"] as Platform[]) {
    const tableMap: Record<Platform, string> = {
      meta: "facebook_ads",
      tiktok: "tiktok_ads",
      meta_insights: "facebook_insights",
    };
    const tableName = tableMap[platform];

    try {
      const bqRows = await readAdzviserTable<Record<string, unknown>>(
        { dataset, table: tableName },
        { dateColumn: "date", startDate, endDate, limit: 50000 }
      );

      if (bqRows.length === 0) continue;

      // 5. Group rows by external_account_id, map to brand_id
      const byAccount = new Map<string, Record<string, unknown>[]>();
      for (const row of bqRows) {
        const accId = String(row.account_id ?? row.advertiser_id ?? row.ad_account_id ?? "");
        if (!accId) continue;
        const list = byAccount.get(accId) ?? [];
        list.push(row);
        byAccount.set(accId, list);
      }

      // 6. Upsert into ad_data
      for (const [accId, accRows] of byAccount) {
        const mapping = adAccounts.find(
          (a) => a.platform === (platform === "meta_insights" ? "meta" : platform) && a.external_account_id === accId
        );
        if (!mapping) continue;

        const inserts = accRows.map((r) => ({
          company_id: companyId,
          brand_id: mapping.brand_id,
          platform: platform === "meta_insights" ? "meta" : platform,
          date_start: r.date as string,
          date_end: r.date as string,
          data: r,
        }));

        const { error: insErr } = await admin.from("ad_data").insert(inserts);
        if (insErr) {
          errors.push(`${platform}/${accId}: ${insErr.message}`);
          continue;
        }
        rows[platform] += inserts.length;
      }
    } catch (e) {
      errors.push(`${platform}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 7. Log sync result
  await admin.from("adzviser_sync_logs").insert({
    company_id: companyId,
    platform: "meta",
    status: errors.length === 0 ? "success" : (rows.meta + rows.tiktok + rows.meta_insights > 0 ? "partial" : "failed"),
    rows_fetched: rows.meta + rows.tiktok + rows.meta_insights,
    error_message: errors.join("; ") || null,
  });

  // 8. Update last_synced_at
  await admin.from("adzviser_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  return { ok: errors.length === 0, rows, errors };
}

/**
 * Sync ALL active agencies. Called by cron.
 */
export async function syncAllAgencies() {
  const admin = createAdminClient();
  const { data: agencies } = await admin
    .from("adzviser_connections")
    .select("company_id")
    .eq("is_active", true);

  if (!agencies) return { synced: 0, results: [] };

  const results = await Promise.all(agencies.map((a) => syncAgency(a.company_id as string)));

  return {
    synced: results.filter((r) => r.ok).length,
    results,
  };
}
