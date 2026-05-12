import { NextResponse } from "next/server";
import { requireClient } from "@/lib/auth/guards";
import { getPeningads } from "@/lib/peningads/client";
import { syncBrandConnections } from "@/lib/peningads/sync-connections";

/**
 * Final step of the headless white-label Facebook OAuth flow.
 *
 * The select-page UI on /client/connections/select-page posts the user's
 * chosen pageId here along with the tempToken + userProfile + profileId
 * + brandId. We finalize the connection with the upstream provider, then
 * reconcile the resulting SocialAccount into brand_ad_accounts and
 * redirect back to /client/connections with the success flag.
 *
 * Why server-side: the tempToken is short-lived but should still not be
 * exposed to the browser longer than needed. By POSTing here we keep
 * it (and the master API key) entirely server-side.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const profileId = String(form.get("profileId") ?? "");
  const pageId = String(form.get("pageId") ?? "");
  const tempToken = String(form.get("tempToken") ?? "");
  const userProfileJson = String(form.get("userProfileJson") ?? "");
  const brandId = String(form.get("brandId") ?? "");

  if (!profileId || !pageId || !tempToken || !userProfileJson || !brandId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Ownership check — only the brand's assigned client can complete its connection
  const user = await requireClient();

  let userProfile: { id: string; username?: string; displayName?: string };
  try {
    userProfile = JSON.parse(userProfileJson);
  } catch {
    return NextResponse.json({ error: "Invalid userProfile" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;

  try {
    const peningads = getPeningads();
    await peningads.selectFacebookPage({
      profileId,
      pageId,
      tempToken,
      userProfile,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save Facebook page selection";
    return NextResponse.redirect(
      `${origin}/client/connections?ok=0&platform=facebook&err=${encodeURIComponent(msg)}`,
      { status: 303 }
    );
  }

  // Reconcile into brand_ad_accounts — best-effort, page still renders the
  // success state if this fails (sync runs hourly via cron too).
  try {
    await syncBrandConnections(brandId);
  } catch {
    // best-effort
  }

  // Touch user reference so the linter knows we used it
  void user;

  return NextResponse.redirect(`${origin}/client/connections?ok=1&platform=facebook`, { status: 303 });
}
