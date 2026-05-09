import { NextResponse } from "next/server";
import { requireClient } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getZernio, type ZernioPlatform } from "@/lib/zernio/client";

// URL platform slug → Zernio platform enum (in their /connect path)
// Google Ads is NOT connectable via Zernio's OAuth — they only support
// facebook/instagram/tiktok/linkedin/twitter/pinterest/youtube. The agency
// has to attach Google Ads separately via Zernio's dashboard.
const ZERNIO_PLATFORM: Record<string, ZernioPlatform> = {
  facebook: "facebook",
  tiktok: "tiktok",
};

// URL platform slug → our internal platform value (matches DB CHECK)
const INTERNAL_PLATFORM: Record<string, string> = {
  facebook: "meta_ads",
  tiktok: "tiktok_ads",
};

export async function POST(_req: Request, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params;
  if (!INTERNAL_PLATFORM[platform]) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }

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

  // Ensure a Zernio profile exists for this brand. Profile = workspace-like
  // grouping that owns the connected social accounts. One per brand.
  let profileId = brand.zernio_profile_id as string | null;
  if (!profileId) {
    try {
      const profile = await zernio.createProfile({
        name: `${brand.name} (AdSolution)`,
        description: `Auto-created for AdSolution brand ${brand.id}`,
      });
      profileId = profile._id;
      const admin = createAdminClient();
      await admin
        .from("brands")
        .update({ zernio_profile_id: profileId })
        .eq("id", brand.id as string);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create Zernio profile";
      // If the profile already exists upstream, try to find it.
      if (msg.includes("already exists")) {
        const { profiles } = await zernio.listProfiles();
        const match = profiles.find((p) => p.name === `${brand.name} (AdSolution)`);
        if (match) {
          profileId = match._id;
          const admin = createAdminClient();
          await admin
            .from("brands")
            .update({ zernio_profile_id: profileId })
            .eq("id", brand.id as string);
        }
      }
      if (!profileId) {
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }
  }

  // Get the OAuth URL from Zernio
  try {
    const { authUrl } = await zernio.getConnectUrl({
      platform: ZERNIO_PLATFORM[platform],
      profileId,
    });
    return NextResponse.json({ authUrl, profileId });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "Zernio connect failed",
    }, { status: 500 });
  }
}
