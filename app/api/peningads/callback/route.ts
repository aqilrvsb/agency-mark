import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumePendingState } from "@/lib/peningads/oauth-state";

/**
 * Peningads redirects users back here after they authorize a Meta/Google/TikTok
 * ad account. Expected query params:
 *   - state         : the token we issued in /api/client/connect/[platform]
 *   - account_id    : the data provider's identifier for the connected social account
 *   - account_name  : (optional) display label
 *   - error         : present if auth failed
 *
 * Note: actual param names depend on the data provider's redirect contract.
 * We accept common variants below.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  const errorMsg = url.searchParams.get("error");

  // Try common param names that providers use
  const accountId =
    url.searchParams.get("account_id") ||
    url.searchParams.get("accountId") ||
    url.searchParams.get("ad_account_id") ||
    url.searchParams.get("id");
  const accountName =
    url.searchParams.get("account_name") ||
    url.searchParams.get("accountName") ||
    url.searchParams.get("name");

  function redirect(qs: Record<string, string>) {
    const target = new URL("/client/connections", url.origin);
    for (const [k, v] of Object.entries(qs)) target.searchParams.set(k, v);
    return NextResponse.redirect(target);
  }

  if (errorMsg) {
    return redirect({ error: errorMsg });
  }

  if (!state) {
    return redirect({ error: "Missing state token" });
  }

  const pending = consumePendingState(state);
  if (!pending) {
    return redirect({ error: "Connection expired or already used. Try again." });
  }

  if (!accountId) {
    return redirect({ error: "No account ID returned from Peningads" });
  }

  // Persist the connection
  const admin = createAdminClient();

  // Verify brand still exists + belongs to a company
  const { data: brand } = await admin
    .from("brands")
    .select("id, company_id, assigned_client_user_id")
    .eq("id", pending.brand_id)
    .maybeSingle();
  if (!brand || brand.assigned_client_user_id !== pending.user_id) {
    return redirect({ error: "Brand assignment changed. Contact your agency." });
  }

  // Upsert ad account row (idempotent on platform + external_account_id)
  const { error: upsertErr } = await admin
    .from("brand_ad_accounts")
    .upsert(
      {
        brand_id: pending.brand_id,
        company_id: brand.company_id as string,
        platform: pending.platform,
        external_account_id: accountId,
        external_account_name: accountName ?? null,
        is_active: true,
      },
      { onConflict: "platform,external_account_id" }
    );

  if (upsertErr) {
    return redirect({ error: upsertErr.message });
  }

  // Optional: log activity
  await admin.from("activity_logs").insert({
    user_id: pending.user_id,
    company_id: brand.company_id as string,
    action: `Connected ${pending.platform}`,
    entity_type: "brand_ad_accounts",
    entity_id: null,
    metadata: { platform: pending.platform, external_account_id: accountId },
  });

  const platformLabel =
    pending.platform === "meta_ads" ? "Facebook Ads"
    : pending.platform === "meta_insights" ? "Facebook Page Insights"
    : pending.platform === "google_ads" ? "Google Ads"
    : pending.platform === "tiktok_ads" ? "TikTok Ads"
    : pending.platform;

  return redirect({ ok: "1", platform: platformLabel });
}
