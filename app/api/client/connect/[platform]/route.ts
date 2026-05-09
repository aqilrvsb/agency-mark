import { NextResponse } from "next/server";
import { requireClient } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
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

  // The brand needs a Zernio profile attached before we can start an OAuth.
  // We tried auto-creating via POST /profiles but Zernio's API rejects that
  // for our key tier (returns 405). For now, the agency must paste a
  // pre-created Zernio profileId via the master admin tools.
  const profileId = brand.zernio_profile_id as string | null;
  if (!profileId) {
    return NextResponse.json({
      error:
        "Your agency hasn't finished setting up your Zernio workspace yet. Use the Support page to contact them, and they'll attach a Zernio profile to your brand. Once that's done, the Connect button will work.",
      code: "no_profile",
    }, { status: 400 });
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
