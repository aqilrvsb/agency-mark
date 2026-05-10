import { createAdminClient } from "@/lib/supabase/admin";
import { getZernio, type ZernioPlatform } from "./client";

const ZERNIO_TO_INTERNAL: Record<string, string> = {
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
    const platform = ZERNIO_TO_INTERNAL[acc.platform as ZernioPlatform];
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
