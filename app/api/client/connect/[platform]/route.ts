import { NextResponse } from "next/server";
import { requireClient } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getZernio, type ZernioPlatform } from "@/lib/zernio/client";

// URL platform slug → Zernio platform enum (in their /connect path)
const ZERNIO_PLATFORM: Record<string, ZernioPlatform> = {
  facebook: "facebook",
  google: "facebook", // TODO: replace once Zernio exposes 'google' in their enum
  tiktok: "tiktok",
};

// URL platform slug → our internal platform value (matches DB CHECK)
const INTERNAL_PLATFORM: Record<string, string> = {
  facebook: "meta_ads",
  google: "google_ads",
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
  const admin = createAdminClient();

  // Ensure the brand has a Zernio profile (create one on first connect)
  let profileId = brand.zernio_profile_id as string | null;
  if (!profileId) {
    try {
      const profile = await zernio.createProfile({
        name: `${brand.name} (AdSolution)`,
        description: `Brand ${brand.id} from AdSolution`,
      });
      profileId = profile._id;
      await admin.from("brands").update({ zernio_profile_id: profileId }).eq("id", brand.id);
    } catch (e) {
      return NextResponse.json({
        error: `Failed to create Zernio profile: ${e instanceof Error ? e.message : String(e)}`,
      }, { status: 500 });
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
