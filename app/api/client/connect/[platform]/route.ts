import { NextResponse } from "next/server";
import { requireClient } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getZernio, type ZernioPlatform } from "@/lib/zernio/client";
import { setPendingState } from "@/lib/zernio/oauth-state";
import { randomBytes } from "node:crypto";

// URL platform slug → Zernio platform enum
const ZERNIO_PLATFORM: Record<string, ZernioPlatform> = {
  facebook: "facebook",
  facebook_insights: "facebook",
  google: "facebook", // TODO: Zernio's enum should expose 'google' once added; sending 'facebook' as fallback
  tiktok: "tiktok",
};

// URL platform slug → our internal platform value (matches DB CHECK)
const INTERNAL_PLATFORM: Record<string, string> = {
  facebook: "meta_ads",
  facebook_insights: "meta_insights",
  google: "google_ads",
  tiktok: "tiktok_ads",
};

export async function POST(req: Request, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params;
  if (!INTERNAL_PLATFORM[platform]) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }

  const user = await requireClient();
  const supabase = await createClient();

  // Find the brand assigned to this client
  const { data: brand } = await supabase
    .from("brands")
    .select("id, company_id")
    .eq("assigned_client_user_id", user.id)
    .maybeSingle();
  if (!brand) {
    return NextResponse.json({ error: "No brand assigned to this account" }, { status: 400 });
  }

  // Build the callback URL
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : new URL(req.url).origin;
  const redirectUri = `${baseUrl}/api/zernio/callback`;

  // Generate state token tying callback to this user/brand/platform
  const state = randomBytes(32).toString("hex");
  setPendingState(state, {
    user_id: user.id,
    brand_id: brand.id as string,
    platform: INTERNAL_PLATFORM[platform],
  });

  try {
    const zernio = getZernio();
    const { authUrl } = await zernio.getConnectUrl({
      platform: ZERNIO_PLATFORM[platform],
      redirectUri,
      state,
    });
    return NextResponse.json({ authUrl });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "Zernio connect failed",
    }, { status: 500 });
  }
}
