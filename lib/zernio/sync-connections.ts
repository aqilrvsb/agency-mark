import { createAdminClient } from "@/lib/supabase/admin";
import { getZernio } from "./client";

/**
 * Map a Zernio SocialAccount.platform value to our internal platform code.
 *
 * After /v1/connect/{platform}/ads, Zernio normally creates a dedicated ads
 * SocialAccount with platform values: metaads / tiktokads / googleads /
 * linkedinads / pinterestads / xads. We register those.
 *
 * Same-token edge case (Meta on free tier): when /v1/connect/facebook/ads
 * returns alreadyConnected:true and Zernio's account cap blocks creating
 * a separate `metaads` row, the organic `facebook` account ends up
 * carrying `adsStatus: "connected"` with the full ads_management /
 * ads_read scopes. listAdAccounts(<facebook _id>) returns the Meta ad
 * accounts just fine — so we register that organic account as meta_ads
 * for sync purposes. Same idea would apply to instagram if/when we wire it.
 */
const ZERNIO_TO_INTERNAL: Record<string, string> = {
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
    .select("id, company_id, zernio_profile_id")
    .eq("id", brandId)
    .maybeSingle();

  if (!brand?.zernio_profile_id) return { synced: 0, skipped: 0 };

  const zernio = getZernio();
  const accounts = await zernio.listAccounts({ profileId: brand.zernio_profile_id as string });

  let synced = 0;
  let skipped = 0;
  for (const acc of accounts) {
    let platform = ZERNIO_TO_INTERNAL[acc.platform as string];
    if (!platform && acc.adsStatus === "connected") {
      platform = SAME_TOKEN_TO_INTERNAL[acc.platform as string];
    }
    if (!platform) {
      skipped++;
      continue;
    }
    const externalId = acc._id;
    const externalName = acc.displayName ?? acc.username ?? acc.metadata?.selectedPageName ?? null;
    const isActive = acc.enabled !== false && acc.isActive !== false && acc.platformStatus !== "disconnected";

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

  return { synced, skipped };
}
