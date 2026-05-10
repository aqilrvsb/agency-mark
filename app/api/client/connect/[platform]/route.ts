import { NextResponse } from "next/server";
import { requireClient } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getZernio, emailTag } from "@/lib/zernio/client";
import { syncBrandConnections } from "@/lib/zernio/sync-connections";

/**
 * Get the brand's Zernio profile id, with three layers of recovery so we
 * stay self-healing when the user externally edits Zernio:
 *   1. brands.zernio_profile_id is set AND the profile still exists in
 *      Zernio (validated by listProfiles) → use it
 *   2. brands.zernio_profile_id is null OR points to a deleted profile,
 *      but Zernio has a profile whose description carries the email tag
 *      → reuse that one (heals "I deleted, then re-registered" cases)
 *   3. Neither — create a fresh Zernio profile and persist its id
 */
async function getOrCreateZernioProfileId(args: {
  brandId: string;
  brandName: string;
  storedProfileId: string | null;
  email: string;
}): Promise<string> {
  const { brandId, brandName, storedProfileId, email } = args;
  const zernio = getZernio();
  const admin = createAdminClient();

  // Always list once — we use this for validation + email-tag fallback.
  const { profiles } = await zernio.listProfiles();
  const valid = (id: string) => profiles.some((p) => p._id === id);

  // (1) stored id still valid in Zernio
  if (storedProfileId && valid(storedProfileId)) return storedProfileId;

  // (2) recover by email tag in description
  const tag = emailTag(email);
  const byEmail = profiles.find((p) => (p.description ?? "").includes(tag));
  if (byEmail) {
    if (storedProfileId !== byEmail._id) {
      await admin.from("brands").update({ zernio_profile_id: byEmail._id }).eq("id", brandId);
    }
    return byEmail._id;
  }

  // (3) create fresh
  const created = await zernio.createProfile({
    name: `${brandName} (AdSolution)`,
    description: `${tag} Auto-created for AdSolution brand ${brandId}`,
  });
  await admin.from("brands").update({ zernio_profile_id: created._id }).eq("id", brandId);
  return created._id;
}

// URL platform slug → Zernio /connect/{platform}/ads value
// Same-token platforms (facebook, instagram, linkedin, pinterest) re-use the
// parent posting account's OAuth token; if the user already connected the Page
// with broad enough scope, this resolves to alreadyConnected with NO new OAuth.
// Separate-token (tiktok, twitter) and standalone (googleads) always return an
// authUrl for the platform-specific marketing-API OAuth.
const ZERNIO_ADS_SLUG: Record<string, "facebook" | "instagram" | "linkedin" | "tiktok" | "twitter" | "pinterest" | "googleads"> = {
  facebook: "facebook",
  tiktok: "tiktok",
  google: "googleads",
};

// URL platform slug → our internal platform value (matches DB CHECK + sync)
const INTERNAL_PLATFORM: Record<string, string> = {
  facebook: "meta_ads",
  tiktok: "tiktok_ads",
  google: "google_ads",
};

export async function POST(req: Request, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params;
  const adsSlug = ZERNIO_ADS_SLUG[platform];
  if (!adsSlug || !INTERNAL_PLATFORM[platform]) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const redirectUrl = `${origin}/client/connections?ok=1&platform=${platform}`;

  const user = await requireClient();
  const supabase = await createClient();

  // Find the brand assigned to this client
  const { data: brand } = await supabase
    .from("brands")
    .select("id, company_id, name, zernio_profile_id")
    .eq("assigned_client_user_id", user.id)
    .maybeSingle();
  if (!brand) {
    return NextResponse.json({ error: "No brand assigned to this account" }, { status: 400 });
  }

  const zernio = getZernio();

  // Resolve a valid Zernio profile id (self-healing — recreates if the
  // profile was deleted externally on the Zernio dashboard).
  let profileId: string;
  try {
    profileId = await getOrCreateZernioProfileId({
      brandId: brand.id as string,
      brandName: brand.name as string,
      storedProfileId: (brand.zernio_profile_id as string | null) ?? null,
      email: user.email,
    });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "Failed to create/find Zernio profile",
    }, { status: 500 });
  }

  // Connect ADS specifically. /v1/connect/{platform}/ads is the only endpoint
  // that grants ad-data access — the regular /v1/connect/{platform} only
  // connects the Page/Profile and ads queries return empty.
  try {
    const result = await zernio.getAdsConnectUrl({
      platform: adsSlug,
      profileId,
      redirectUrl,
    });

    // Same-token shortcut (Meta / IG / LinkedIn / Pinterest) when the parent
    // Page token already has ads scope: ads SocialAccount is created
    // instantly with no OAuth round-trip.
    if ("alreadyConnected" in result && result.alreadyConnected) {
      // Reconcile the new metaads / linkedinads / pinterestads SocialAccount
      // into our brand_ad_accounts + brand_platform_ad_accounts tables.
      try {
        await syncBrandConnections(brand.id as string);
      } catch {
        // best-effort
      }
      return NextResponse.json({
        alreadyConnected: true,
        accountId: result.accountId,
        platform: result.platform,
        redirect: redirectUrl,
        profileId,
      });
    }

    // OAuth flow path — return the authUrl so the frontend redirects to
    // Meta/TikTok/Google's consent screen.
    if ("authUrl" in result) {
      return NextResponse.json({ authUrl: result.authUrl, profileId });
    }

    return NextResponse.json({ error: "Unexpected Zernio response" }, { status: 500 });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "Zernio connect failed",
    }, { status: 500 });
  }
}
