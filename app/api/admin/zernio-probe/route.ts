import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Diagnostic. For each connected social account on a brand, walks every
 * Meta Ad Account and queries /v1/ads, /v1/ads/campaigns, /v1/ads/tree
 * over a wide date range (default 365 days) so we can confirm whether
 * the connected accounts have ANY historical data — campaigns, ad sets,
 * or ads.
 *
 * GET /api/admin/zernio-probe?brand_id=<uuid>&days=365
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const brandId = url.searchParams.get("brand_id");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const days = Math.min(730, Math.max(7, Number(url.searchParams.get("days") ?? 365)));
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
  // Explicit ?from=YYYY-MM-DD&to=YYYY-MM-DD takes priority; fallback to days=N
  const today = toParam ?? new Date().toISOString().slice(0, 10);
  let fromDate: string;
  if (fromParam) {
    fromDate = fromParam;
  } else {
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);
    fromDate = startDate.toISOString().slice(0, 10);
  }

  const probes: Record<string, unknown>[] = [];

  for (const acc of accounts) {
    const socialAccountId = acc.external_account_id as string;
    const socialProbe: Record<string, unknown> = {
      socialAccountId,
      socialAccountName: acc.external_account_name,
      ourPlatform: acc.platform,
      window: { fromDate, toDate: today, days },
      adAccounts: [] as unknown[],
    };

    // /v1/ads/accounts
    let discoveredAdAccounts: { id: string; name: string; currency?: string }[] = [];
    try {
      const r = await fetch(`${base}/ads/accounts?accountId=${encodeURIComponent(socialAccountId)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      socialProbe.adAccountsStatus = r.status;
      const body = (await r.json().catch(() => ({}))) as { accounts?: { id: string; name: string; currency?: string }[] };
      discoveredAdAccounts = body.accounts ?? [];
      socialProbe.adAccountsCount = discoveredAdAccounts.length;
    } catch (e) {
      socialProbe.adAccountsError = e instanceof Error ? e.message : String(e);
    }

    // For each discovered Meta Ad Account, probe ads / campaigns / tree
    const adAccountProbes: Record<string, unknown>[] = [];
    for (const adAcc of discoveredAdAccounts) {
      const adProbe: Record<string, unknown> = {
        adAccountId: adAcc.id,
        adAccountName: adAcc.name,
        currency: adAcc.currency,
      };

      // /v1/ads
      try {
        const r = await fetch(
          `${base}/ads?adAccountId=${encodeURIComponent(adAcc.id)}&platform=facebook&fromDate=${fromDate}&toDate=${today}&limit=5&source=all`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        adProbe.adsStatus = r.status;
        const body = (await r.json().catch(() => ({}))) as { ads?: unknown[]; pagination?: { total?: number } };
        adProbe.adsTotal = body.pagination?.total ?? null;
        adProbe.adsSampleCount = Array.isArray(body.ads) ? body.ads.length : 0;
        adProbe.firstAd = Array.isArray(body.ads) && body.ads.length > 0 ? body.ads[0] : null;
      } catch (e) {
        adProbe.adsError = e instanceof Error ? e.message : String(e);
      }

      // /v1/ads/campaigns (with optional date filter — Zernio aggregates from /v1/ads)
      try {
        const r = await fetch(
          `${base}/ads/campaigns?adAccountId=${encodeURIComponent(adAcc.id)}&platform=facebook&limit=5&source=all&fromDate=${fromDate}&toDate=${today}`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        adProbe.campaignsStatus = r.status;
        const body = (await r.json().catch(() => ({}))) as { campaigns?: unknown[]; pagination?: { total?: number } };
        adProbe.campaignsTotal = body.pagination?.total ?? null;
        adProbe.campaignsSampleCount = Array.isArray(body.campaigns) ? body.campaigns.length : 0;
        adProbe.firstCampaign = Array.isArray(body.campaigns) && body.campaigns.length > 0 ? body.campaigns[0] : null;
      } catch (e) {
        adProbe.campaignsError = e instanceof Error ? e.message : String(e);
      }

      // /v1/ads/tree (full hierarchy in one call)
      try {
        const r = await fetch(
          `${base}/ads/tree?adAccountId=${encodeURIComponent(adAcc.id)}&platform=facebook`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        adProbe.treeStatus = r.status;
        const treeBody = await r.json().catch(() => ({}));
        adProbe.treeBody = treeBody;
      } catch (e) {
        adProbe.treeError = e instanceof Error ? e.message : String(e);
      }

      adAccountProbes.push(adProbe);
    }

    socialProbe.adAccounts = adAccountProbes;
    probes.push(socialProbe);
  }

  return NextResponse.json({ probes }, { status: 200 });
}
