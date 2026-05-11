import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncBrandWindow } from "@/lib/peningads/sync";

/**
 * Peningads webhook receiver.
 *
 * Configured via the data provider's dashboard (Webhooks) or POST /v1/webhooks.
 * Subscribe to at minimum these events:
 *
 *   - account.connected                   (Page or Ad SocialAccount created)
 *   - account.disconnected                (token revoked / account removed)
 *   - account.ads.initial_sync_completed  (90-day discovery backfill done)
 *
 * Signed with HMAC-SHA256 over the raw body using PENINGADS_WEBHOOK_SECRET,
 * sent in the X-Peningads-Signature header. We verify before doing any work.
 */
export async function POST(req: Request) {
  const secret =
    process.env.PENINGADS_WEBHOOK_SECRET ?? process.env.ZERNIO_WEBHOOK_SECRET;
  const signature =
    req.headers.get("x-peningads-signature") ??
    req.headers.get("x-zernio-signature") ??
    "";
  const raw = await req.text();

  if (secret) {
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: WebhookEnvelope;
  try {
    event = JSON.parse(raw) as WebhookEnvelope;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.event) {
    case "account.ads.initial_sync_completed":
      await handleAdsInitialSyncCompleted(event, admin);
      break;
    case "account.connected":
    case "account.disconnected":
      await handleAccountStateChange(event, admin);
      break;
    case "webhook.test":
      // The data provider's test ping
      break;
    default:
      // Ignore other events
      break;
  }

  return NextResponse.json({ ok: true });
}

interface WebhookEnvelope {
  id: string;
  event: string;
  account?: {
    accountId: string;
    profileId: string;
    platform: string;
    username?: string;
    displayName?: string;
    platformAdAccountId?: string;
    platformAdAccountIds?: string[];
  };
  sync?: {
    status: "success" | "failure";
    totalAds?: number;
    synced?: number;
    failed?: number;
    error?: string;
    errorCategory?: string;
  };
  timestamp: string;
}

async function handleAdsInitialSyncCompleted(
  event: WebhookEnvelope,
  admin: ReturnType<typeof createAdminClient>
) {
  if (!event.account || !event.sync) return;

  // Find the brand by peningads_profile_id
  const { data: brand } = await admin
    .from("brands")
    .select("id")
    .eq("peningads_profile_id", event.account.profileId)
    .maybeSingle();
  if (!brand) return;

  // Mark last_synced_at on every brand_platform_ad_accounts row that came
  // from this account so we know the initial backfill ran.
  const stamp = new Date().toISOString();
  await admin
    .from("brand_platform_ad_accounts")
    .update({ last_synced_at: stamp, status: event.sync.status === "success" ? "ready" : "error" })
    .eq("brand_id", brand.id as string)
    .eq("social_account_id", event.account.accountId);

  // Trigger our internal sync to pull the freshly-discovered ads into ad_data.
  // 90 days matches the data provider's default discovery window.
  if (event.sync.status === "success" && (event.sync.synced ?? 0) > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date();
    start.setDate(start.getDate() - 90);
    const fromDate = start.toISOString().slice(0, 10);
    try {
      await syncBrandWindow({ brandId: brand.id as string, fromDate, toDate: today });
    } catch (e) {
      console.error("[webhook] syncBrandWindow failed", e);
    }
  }
}

async function handleAccountStateChange(
  event: WebhookEnvelope,
  admin: ReturnType<typeof createAdminClient>
) {
  if (!event.account) return;
  const { data: brand } = await admin
    .from("brands")
    .select("id")
    .eq("peningads_profile_id", event.account.profileId)
    .maybeSingle();
  if (!brand) return;

  const isActive = event.event === "account.connected";
  await admin
    .from("brand_ad_accounts")
    .update({ is_active: isActive })
    .eq("brand_id", brand.id as string)
    .eq("external_account_id", event.account.accountId);
}

// Peningads sometimes sends GET pings to verify the endpoint exists
export async function GET() {
  return NextResponse.json({ ok: true, service: "peningads-webhook" });
}
