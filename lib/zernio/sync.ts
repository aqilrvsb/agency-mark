import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import {
  getZernio,
  toZernioAdsPlatform,
  type ZernioAd,
  type ZernioAdMetrics,
  type ZernioAdsPlatform,
  type ZernioPlatformAdAccount,
} from "./client";

export type Platform = "meta_ads" | "tiktok_ads" | "meta_insights" | "google_ads";

export interface SyncResult {
  ok: boolean;
  rowsByPlatform: Record<string, number>;
  adAccountsDiscovered: number;
  adsScanned: number;
  errors: string[];
}

/**
 * Sync one brand: walk every connected SocialAccount → discover its
 * Platform Ad Accounts → list ads in the date window → fetch per-day
 * analytics for each ad → upsert per-(brand, platform, ad_account, ad,
 * date) rows into ad_data.
 *
 * Idempotent: deletes existing rows in the (brand, platform, ad_account,
 * date_start in [from,to]) window before inserting the fresh batch.
 */
export async function syncBrandWindow(opts: {
  brandId: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
}): Promise<SyncResult> {
  const admin = createAdminClient();
  const zernio = getZernio();
  const errors: string[] = [];
  const rowsByPlatform: Record<string, number> = {};
  let adAccountsDiscovered = 0;
  let adsScanned = 0;

  const { data: brand } = await admin
    .from("brands")
    .select("id, company_id")
    .eq("id", opts.brandId)
    .maybeSingle();
  if (!brand) {
    return { ok: false, rowsByPlatform, adAccountsDiscovered, adsScanned, errors: ["Brand not found"] };
  }
  const companyId = brand.company_id as string;

  const { data: socialAccounts } = await admin
    .from("brand_ad_accounts")
    .select("platform, external_account_id, external_account_name")
    .eq("brand_id", opts.brandId)
    .eq("is_active", true);

  if (!socialAccounts || socialAccounts.length === 0) {
    return { ok: false, rowsByPlatform, adAccountsDiscovered, adsScanned, errors: ["No active social accounts on this brand"] };
  }

  for (const sa of socialAccounts) {
    const internalPlatform = sa.platform as string;
    const zernioPlatform = toZernioAdsPlatform(internalPlatform);
    if (!zernioPlatform) continue;
    const socialAccountId = sa.external_account_id as string;

    // 1. Discover Platform Ad Accounts under this Social Account
    let adAccounts: ZernioPlatformAdAccount[] = [];
    try {
      adAccounts = await zernio.listAdAccounts(socialAccountId);
    } catch (e) {
      errors.push(`listAdAccounts(${socialAccountId}): ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    // Cache the discovered Ad Accounts in brand_platform_ad_accounts
    for (const adAcc of adAccounts) {
      await admin
        .from("brand_platform_ad_accounts")
        .upsert(
          {
            brand_id: opts.brandId,
            company_id: companyId,
            social_account_id: socialAccountId,
            platform: internalPlatform,
            platform_ad_account_id: adAcc.id,
            ad_account_name: adAcc.name ?? null,
            currency: adAcc.currency ?? null,
            status: adAcc.status ?? null,
            timezone_name: adAcc.timezoneName ?? null,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "brand_id,platform,platform_ad_account_id" }
        );
      adAccountsDiscovered++;
    }

    // 2. For each Ad Account, list ads in window and pull per-day analytics
    for (const adAcc of adAccounts) {
      const insertsThisAccount: PerDayRow[] = [];

      try {
        // Paginate through ads (limit 100, up to 5 pages = 500 ads max per
        // sync — plenty for an SME, prevents runaway calls)
        for (let page = 1; page <= 5; page++) {
          const r = await zernio.listAds({
            adAccountId: adAcc.id,
            platform: zernioPlatform,
            fromDate: opts.fromDate,
            toDate: opts.toDate,
            limit: 100,
            page,
            source: "all",
          });
          adsScanned += r.ads.length;
          // Two-pass strategy:
          //  1. Summary pass — for every ad with any non-zero metric, write
          //     one row dated to opts.toDate. Cheap (one /v1/ads call per
          //     page already gave us the metrics).
          //  2. Daily-enhance pass — for ads with substantive spend, swap
          //     the summary row for per-day rows from /v1/ads/{adId}/analytics.
          //     Throttled to 1 call / 1.1s to stay under Zernio's 60 req/min.
          //     If we hit the rate limit anyway, fall back to the summary
          //     row already in the buffer.
          interface AdSnap {
            ad: ZernioAd;
            metrics: ZernioAdMetrics;
            adId: string;
          }
          const snaps: AdSnap[] = [];
          for (const ad of r.ads) {
            const adId = ad._id ?? ad.id;
            if (!adId) continue;
            const m = (ad as { metrics?: ZernioAdMetrics }).metrics ?? {};
            const lastSyncedAt = (m as { lastSyncedAt?: string }).lastSyncedAt;
            const hasAnyMetric =
              num(m.spend) > 0 ||
              num(m.impressions) > 0 ||
              num(m.clicks) > 0 ||
              num(m.conversions) > 0;
            if (!lastSyncedAt && !hasAnyMetric) continue;
            snaps.push({ ad, metrics: m, adId });
          }

          // Summary rows for everyone
          for (const s of snaps) {
            insertsThisAccount.push(toRow({
              companyId,
              brandId: opts.brandId,
              internalPlatform,
              adAccount: adAcc,
              ad: s.ad,
              day: { ...s.metrics, date: opts.toDate },
            }));
          }

          // Daily-enhance for ads with spend > 0 (skip the rest to save calls)
          const enhanceTargets = snaps.filter((s) => num(s.metrics.spend) > 0);
          let rateLimited = false;
          for (let i = 0; i < enhanceTargets.length && !rateLimited; i++) {
            const s = enhanceTargets[i];
            try {
              const analytics = await zernio.getAdAnalytics(s.adId, {
                fromDate: opts.fromDate,
                toDate: opts.toDate,
              });
              const dailyRows = analytics.analytics.daily ?? [];
              if (dailyRows.length > 0) {
                // Drop the summary row for this ad, replace with per-day rows
                const summaryIdx = insertsThisAccount.findIndex(
                  (row) => row.ad_id === s.adId
                );
                if (summaryIdx >= 0) insertsThisAccount.splice(summaryIdx, 1);
                for (const day of dailyRows) {
                  insertsThisAccount.push(toRow({
                    companyId,
                    brandId: opts.brandId,
                    internalPlatform,
                    adAccount: adAcc,
                    ad: s.ad,
                    day,
                  }));
                }
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
                rateLimited = true;
                errors.push(`getAdAnalytics rate-limited at ad ${i + 1}/${enhanceTargets.length} — falling back to summary rows for the rest`);
              } else {
                errors.push(`getAdAnalytics(${s.adId}): ${msg}`);
              }
            }
            // Throttle: 1100ms between calls keeps us under 60 req/min
            if (i < enhanceTargets.length - 1) {
              await new Promise((r) => setTimeout(r, 1100));
            }
          }
          if (r.pagination.page >= r.pagination.pages) break;
        }
      } catch (e) {
        errors.push(`listAds(${adAcc.id}): ${e instanceof Error ? e.message : String(e)}`);
      }

      if (insertsThisAccount.length === 0) continue;

      // Dedup the cache window for this (brand, platform, ad_account, date range)
      // before inserting the fresh batch
      await admin
        .from("ad_data")
        .delete()
        .eq("brand_id", opts.brandId)
        .eq("platform", internalPlatform)
        .eq("platform_ad_account_id", adAcc.id)
        .gte("date_start", opts.fromDate)
        .lte("date_start", opts.toDate);

      // Insert in batches of 500
      for (let i = 0; i < insertsThisAccount.length; i += 500) {
        const batch = insertsThisAccount.slice(i, i + 500);
        const { error } = await admin.from("ad_data").insert(batch);
        if (error) {
          errors.push(`ad_data insert (${adAcc.id}): ${error.message}`);
          break;
        }
      }
      rowsByPlatform[internalPlatform] = (rowsByPlatform[internalPlatform] ?? 0) + insertsThisAccount.length;
    }
  }

  // Log the sync
  const totalRows = Object.values(rowsByPlatform).reduce((s, n) => s + n, 0);
  await admin.from("adzviser_sync_logs").insert({
    company_id: companyId,
    brand_id: opts.brandId,
    platform: "meta_ads",
    status: errors.length === 0 ? "success" : (totalRows > 0 ? "partial" : "failed"),
    rows_fetched: totalRows,
    error_message: errors.length > 0 ? errors.join("; ").slice(0, 2000) : null,
  });

  return {
    ok: errors.length === 0,
    rowsByPlatform,
    adAccountsDiscovered,
    adsScanned,
    errors,
  };
}

interface PerDayRow {
  company_id: string;
  brand_id: string;
  platform: string;
  platform_ad_account_id: string;
  ad_account_currency: string | null;
  ad_id: string;
  date_start: string;
  date_end: string;
  data: Json;
}

function toRow(p: {
  companyId: string;
  brandId: string;
  internalPlatform: string;
  adAccount: ZernioPlatformAdAccount;
  ad: ZernioAd;
  day: ZernioAdMetrics & { date: string };
}): PerDayRow {
  // Normalize the daily metrics into the JSONB column. Keep both Zernio's
  // raw field names AND our canonical ones so downstream code that reads
  // either form keeps working.
  const m = p.day;
  const data = {
    // canonical
    spend: num(m.spend),
    impressions: num(m.impressions),
    clicks: num(m.clicks),
    conversions: num(m.conversions),
    purchase_value: num(m.purchase_value ?? m.conversion_value),
    ctr: num(m.ctr),
    cpc: num(m.cpc),
    cpm: num(m.cpm),
    cpa: num(m.cpa),
    roas: num(m.roas),
    // ad / campaign context — Zernio actually returns platformCampaignId /
    // platformAdSetId (the Meta IDs), not campaignId / adSetId. Read both.
    ad_id: p.ad._id ?? p.ad.id ?? null,
    ad_name: p.ad.name ?? null,
    platform_ad_id: (p.ad as { platformAdId?: string }).platformAdId ?? null,
    campaign_id: (p.ad as { platformCampaignId?: string }).platformCampaignId ?? p.ad.campaignId ?? null,
    campaign_name: p.ad.campaignName ?? null,
    adset_id: (p.ad as { platformAdSetId?: string }).platformAdSetId ?? p.ad.adSetId ?? null,
    adset_name: p.ad.adSetName ?? null,
    status: p.ad.status ?? p.ad.effectiveStatus ?? null,
    creative_thumbnail: (p.ad as { creative?: { thumbnailUrl?: string } }).creative?.thumbnailUrl ?? null,
    creative_body: (p.ad as { creative?: { body?: string } }).creative?.body ?? null,
    // Capture image + video URLs so the creative gallery's lightbox can
    // render them (image = larger view, video = inline player). Zernio's
    // videoUrl points at the public facebook.com/watch page; we render it
    // through Meta's video plugin iframe in the modal so it plays inline.
    creative_image_url: (p.ad as { creative?: { imageUrl?: string } }).creative?.imageUrl ?? null,
    creative_video_url: (p.ad as { creative?: { videoUrl?: string } }).creative?.videoUrl ?? null,
    creative_video_id: (p.ad as { creative?: { videoId?: string } }).creative?.videoId ?? null,
  } satisfies Record<string, unknown>;

  return {
    company_id: p.companyId,
    brand_id: p.brandId,
    platform: p.internalPlatform,
    platform_ad_account_id: p.adAccount.id,
    ad_account_currency: p.adAccount.currency ?? null,
    ad_id: p.ad._id ?? p.ad.id ?? null,
    date_start: m.date,
    date_end: m.date,
    data: data as unknown as Json,
  };
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ─────────────────────────────────────────────────────────
// Cron entry points (legacy compatibility)
// ─────────────────────────────────────────────────────────

/**
 * syncAgency — back-compat wrapper called by /api/cron/sync. Pulls last
 * 2 days for every brand under the agency. Forward-sync only.
 */
export async function syncAgency(companyId: string) {
  const admin = createAdminClient();
  const { data: brands } = await admin
    .from("brands")
    .select("id")
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (!brands || brands.length === 0) {
    return { ok: false, rowsByPlatform: {}, errors: ["No active brands"], adAccountsDiscovered: 0, adsScanned: 0 };
  }

  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(); start.setDate(start.getDate() - 2);
  const fromDate = start.toISOString().slice(0, 10);

  const merged: SyncResult = {
    ok: true,
    rowsByPlatform: {},
    adAccountsDiscovered: 0,
    adsScanned: 0,
    errors: [],
  };

  for (const b of brands) {
    const r = await syncBrandWindow({ brandId: b.id as string, fromDate, toDate: today });
    if (!r.ok) merged.ok = false;
    merged.adAccountsDiscovered += r.adAccountsDiscovered;
    merged.adsScanned += r.adsScanned;
    for (const [k, v] of Object.entries(r.rowsByPlatform)) {
      merged.rowsByPlatform[k] = (merged.rowsByPlatform[k] ?? 0) + v;
    }
    merged.errors.push(...r.errors.map((e) => `${b.id}: ${e}`));
  }

  await admin.from("adzviser_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("company_id", companyId);

  return merged;
}

/**
 * syncAllAgencies — called by hourly cron. Forward-syncs last 2 days
 * for every brand that has at least one connected ad account.
 */
export async function syncAllAgencies() {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("brand_ad_accounts")
    .select("company_id")
    .eq("is_active", true);

  if (!rows) return { synced: 0, results: [] };

  const uniqueCompanyIds = [...new Set(rows.map((a) => a.company_id as string))];
  const results = await Promise.all(uniqueCompanyIds.map((id) => syncAgency(id)));

  return {
    synced: results.filter((r) => r.ok).length,
    results,
  };
}
