import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * One-off diagnostic. Hits Zernio /v1/ads/accounts then /v1/ads with the
 * connected social account for the given brand and dumps the raw JSON
 * shape so we can confirm field names, ID formats, and response wrappers.
 *
 * GET /api/admin/zernio-probe?brand_id=<uuid>
 * Auth: Authorization: Bearer ${CRON_SECRET}
 *
 * Safe to delete once the real sync is in place.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const brandId = url.searchParams.get("brand_id");
  const adAccountIdParam = url.searchParams.get("ad_account_id");
  if (!brandId) return NextResponse.json({ error: "brand_id required" }, { status: 400 });

  const apiKey = process.env.ZERNIO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ZERNIO_API_KEY not set" }, { status: 500 });

  const admin = createAdminClient();
  const { data: accounts } = await admin
    .from("brand_ad_accounts")
    .select("platform, external_account_id, external_account_name")
    .eq("brand_id", brandId);

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: "No connected accounts on this brand" }, { status: 404 });
  }

  const base = "https://zernio.com/api/v1";
  const out: Record<string, unknown>[] = [];

  for (const acc of accounts) {
    const socialAccountId = acc.external_account_id as string;
    const probe: Record<string, unknown> = {
      socialAccountId,
      socialAccountName: acc.external_account_name,
      ourPlatform: acc.platform,
    };

    // 1. /v1/ads/accounts → list platform Ad Accounts under this social account
    try {
      const r = await fetch(`${base}/ads/accounts?accountId=${encodeURIComponent(socialAccountId)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      probe.adAccountsStatus = r.status;
      probe.adAccountsBody = await r.json().catch(() => ({}));
    } catch (e) {
      probe.adAccountsError = e instanceof Error ? e.message : String(e);
    }

    const today = new Date().toISOString().slice(0, 10);
    const start = new Date(); start.setDate(start.getDate() - 90);
    const fromDate = start.toISOString().slice(0, 10);

    // Use the override ad_account_id if provided, otherwise pull the first
    // discovered Meta Ad Account from the /ads/accounts response above.
    const discovered = (probe.adAccountsBody as { accounts?: { id?: string }[] } | undefined)?.accounts;
    const effectiveAdAccountId = adAccountIdParam ?? discovered?.[0]?.id;
    probe.effectiveAdAccountId = effectiveAdAccountId;

    if (effectiveAdAccountId) {
      // 2. /v1/ads → ads under this Meta Ad Account
      try {
        const r = await fetch(
          `${base}/ads?adAccountId=${encodeURIComponent(effectiveAdAccountId)}&platform=facebook&fromDate=${fromDate}&toDate=${today}&limit=10`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        probe.adsStatus = r.status;
        const body = (await r.json().catch(() => ({}))) as { ads?: unknown[]; pagination?: unknown };
        probe.adsCount = Array.isArray(body.ads) ? body.ads.length : null;
        probe.adsSample = Array.isArray(body.ads) ? body.ads.slice(0, 2) : body;
        probe.adsPagination = body.pagination;
      } catch (e) {
        probe.adsError = e instanceof Error ? e.message : String(e);
      }

      // 3. /v1/ads/campaigns → campaigns under this Meta Ad Account
      try {
        const r = await fetch(
          `${base}/ads/campaigns?adAccountId=${encodeURIComponent(effectiveAdAccountId)}&platform=facebook&limit=10`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        probe.campaignsStatus = r.status;
        const body = (await r.json().catch(() => ({}))) as { campaigns?: unknown[] };
        probe.campaignsCount = Array.isArray(body.campaigns) ? body.campaigns.length : null;
        probe.campaignsSample = Array.isArray(body.campaigns) ? body.campaigns.slice(0, 2) : body;
      } catch (e) {
        probe.campaignsError = e instanceof Error ? e.message : String(e);
      }
    }

    out.push(probe);
  }

  return NextResponse.json({ probes: out }, { status: 200 });
}
