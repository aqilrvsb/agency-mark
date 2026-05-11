import { createAdminClient } from "@/lib/supabase/admin";
import { getPeningads } from "./client";

/**
 * Map a Peningads SocialAccount.platform value to our internal platform code.
 *
 * After /v1/connect/{platform}/ads, Peningads normally creates a dedicated ads
 * SocialAccount with platform values: metaads / tiktokads / googleads /
 * linkedinads / pinterestads / xads. We register those.
 *
 * Same-token edge case (Meta on free tier): when /v1/connect/facebook/ads
 * returns alreadyConnected:true and the data provider's account cap blocks
 * creating a separate `metaads` row, the organic `facebook` account ends up
 * carrying `adsStatus: "connected"` with the full ads_management /
 * ads_read scopes. listAdAccounts(<facebook _id>) returns the Meta ad
 * accounts just fine — so we register that organic account as meta_ads
 * for sync purposes. Same idea would apply to instagram if/when we wire it.
 */
const PENINGADS_TO_INTERNAL: Record<string, string> = {
  metaads: "meta_ads",
  tiktokads: "tiktok_ads",
  googleads: "google_ads",
};

// Organic platforms whose SocialAccount can carry ads scope (same-token).
// Mapped only when `adsStatus === "connected"` on that account.
const SAME_TOKEN_TO_INTERNAL: Record<string, string> = {
  facebook: "meta_ads",
  instagram: "meta_ads",
};

export async function syncBrandConnections(brandId: string): Promise<{ synced: number; skipped: number }> {
  const admin = createAdminClient();
  const { data: brand } = await admin
    .from("brands")
    .select("id, company_id, peningads_profile_id")
    .eq("id", brandId)
    .maybeSingle();

  if (!brand?.peningads_profile_id) return { synced: 0, skipped: 0 };

  const peningads = getPeningads();
  const accounts = await peningads.listAccounts({ profileId: brand.peningads_profile_id as string });

  // Dedup pass 1: find every parent SocialAccount that already has a dedicated
  // ads-side child (metaads/tiktokads/googleads). When such a child exists, the
  // parent's same-token fallback is redundant — we skip it so the brand only
  // gets ONE row per logical Page in brand_ad_accounts.
  const adsParents = new Set<string>();
  for (const acc of accounts) {
    if (PENINGADS_TO_INTERNAL[acc.platform as string]) {
      const parent = (acc as { parentAccountId?: string }).parentAccountId;
      if (parent) adsParents.add(parent);
    }
  }

  // Track the SocialAccount ids we end up registering, so we can deactivate
  // any rows in brand_ad_accounts that point to accounts that are no longer
  // active in Peningads (cleans up the stale facebook same-token row when a
  // metaads gets added later).
  const registeredIds = new Set<string>();

  let synced = 0;
  let skipped = 0;
  for (const acc of accounts) {
    let platform = PENINGADS_TO_INTERNAL[acc.platform as string];
    if (!platform && acc.adsStatus === "connected") {
      // Skip the same-token fallback if a dedicated ads child already covers
      // this parent — avoids the "two cards for the same Page" duplicate.
      if (adsParents.has(acc._id)) {
        skipped++;
        continue;
      }
      platform = SAME_TOKEN_TO_INTERNAL[acc.platform as string];
    }
    if (!platform) {
      skipped++;
      continue;
    }
    const externalId = acc._id;
    const externalName = acc.displayName ?? acc.username ?? acc.metadata?.selectedPageName ?? null;
    const isActive = acc.enabled !== false && acc.isActive !== false && acc.platformStatus !== "disconnected";

    registeredIds.add(externalId);

    const { data: existing } = await admin
      .from("brand_ad_accounts")
      .select("id")
      .eq("brand_id", brand.id as string)
      .eq("platform", platform)
      .eq("external_account_id", externalId)
      .maybeSingle();

    if (existing) {
      await admin
        .from("brand_ad_accounts")
        .update({ external_account_name: externalName, is_active: isActive })
        .eq("id", existing.id as string);
    } else {
      await admin.from("brand_ad_accounts").insert({
        brand_id: brand.id as string,
        company_id: brand.company_id as string,
        platform,
        external_account_id: externalId,
        external_account_name: externalName,
        is_active: isActive,
      });
    }
    synced++;
  }

  // Dedup pass 2: any existing brand_ad_accounts row whose external_account_id
  // is NOT in registeredIds (e.g. the stale same-token row that the new dedup
  // skipped) gets deleted along with its dependent brand_platform_ad_accounts.
  // We only consider Meta-shaped rows here so we don't accidentally nuke
  // TikTok/Google rows when this runs for a Meta reconnect.
  const { data: existingRows } = await admin
    .from("brand_ad_accounts")
    .select("id, external_account_id")
    .eq("brand_id", brand.id as string)
    .eq("platform", "meta_ads");

  for (const row of existingRows ?? []) {
    const extId = row.external_account_id as string;
    if (!registeredIds.has(extId)) {
      // Drop the platform_ad_accounts that referenced this stale Social Account
      await admin
        .from("brand_platform_ad_accounts")
        .delete()
        .eq("brand_id", brand.id as string)
        .eq("social_account_id", extId);
      await admin
        .from("brand_ad_accounts")
        .delete()
        .eq("id", row.id as string);
    }
  }

  return { synced, skipped };
}
