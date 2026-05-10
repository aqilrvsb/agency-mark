import { createAdminClient } from "@/lib/supabase/admin";
import { getZernio } from "./client";

/**
 * Map a Zernio SocialAccount.platform value to our internal platform code.
 *
 * After /v1/connect/{platform}/ads, Zernio creates a dedicated ads SocialAccount
 * with platform values: metaads / tiktokads / googleads / linkedinads / pinterestads / xads.
 *
 * The earlier organic-only OAuth created posting SocialAccounts with values
 * like "facebook" / "instagram" / "tiktok" — we keep those mappings for
 * back-compat with brands that connected before the ads endpoint was wired.
 */
const ZERNIO_TO_INTERNAL: Record<string, string> = {
  // Ads SocialAccounts (post /v1/connect/{platform}/ads)
  metaads: "meta_ads",
  tiktokads: "tiktok_ads",
  googleads: "google_ads",
  // Organic SocialAccounts — kept for legacy/back-compat
  facebook: "meta_ads",
  instagram: "meta_ads",
  tiktok: "tiktok_ads",
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
    const platform = ZERNIO_TO_INTERNAL[acc.platform as string];
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
