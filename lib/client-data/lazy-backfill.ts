import { createAdminClient } from "@/lib/supabase/admin";
import { syncBrandWindow } from "@/lib/zernio/sync";

const SYNC_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Lazy-backfill on /client/overview (or any tab that takes a date range).
 *
 * On every render:
 *   1. If the brand has connected ad accounts AND we don't have ad_data
 *      rows covering the requested window, fetch from Zernio inline.
 *   2. Otherwise check the most recent sync log for this brand — if it
 *      ran in the last 6h we trust the cache; if older AND the requested
 *      window includes today/yesterday, run a quick forward-sync.
 *
 * Best-effort: never throws. Returns metadata for logging only.
 */
export async function ensureFreshAdData(opts: {
  brandId: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
}): Promise<{ triggered: boolean; reason: string; rowsAdded?: number; errors?: string[] }> {
  try {
    const admin = createAdminClient();

    // Skip the dance entirely if the brand has no connected accounts —
    // the empty-state UI handles "connect an ad account" CTAs.
    const { data: hasConnection } = await admin
      .from("brand_ad_accounts")
      .select("id")
      .eq("brand_id", opts.brandId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (!hasConnection) {
      return { triggered: false, reason: "no_connected_accounts" };
    }

    // Fast path: do we already have ANY rows in the requested window?
    const { count } = await admin
      .from("ad_data")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", opts.brandId)
      .gte("date_start", opts.fromDate)
      .lte("date_start", opts.toDate);

    const hasAnyRowsInWindow = (count ?? 0) > 0;

    // Find the most recent sync log
    const { data: lastSync } = await admin
      .from("adzviser_sync_logs")
      .select("synced_at, status")
      .eq("brand_id", opts.brandId)
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastSyncedAt = lastSync?.synced_at ? new Date(lastSync.synced_at as string).getTime() : 0;
    const fresh = Date.now() - lastSyncedAt < SYNC_TTL_MS;

    // Skip sync only if we both have rows AND the cache is fresh
    if (hasAnyRowsInWindow && fresh) {
      return { triggered: false, reason: "cache_hit" };
    }

    // WARM-BUT-STALE: we have data in the window already; the user can read
    // it immediately. Fire the refresh in the background (no await) so the
    // page render isn't blocked by the per-ad analytics calls (~2-15s).
    if (hasAnyRowsInWindow) {
      void syncBrandWindow({
        brandId: opts.brandId,
        fromDate: opts.fromDate,
        toDate: opts.toDate,
      }).catch(() => {
        // best-effort; sync log captures the error trace
      });
      return { triggered: true, reason: "stale_cache_async" };
    }

    // COLD: no rows in window. Block on the sync — there's nothing to render
    // otherwise.
    const result = await syncBrandWindow({
      brandId: opts.brandId,
      fromDate: opts.fromDate,
      toDate: opts.toDate,
    });

    const totalRows = Object.values(result.rowsByPlatform).reduce((s, n) => s + n, 0);
    return {
      triggered: true,
      reason: "cold_window",
      rowsAdded: totalRows,
      errors: result.errors,
    };
  } catch (e) {
    return {
      triggered: false,
      reason: "error",
      errors: [e instanceof Error ? e.message : String(e)],
    };
  }
}
