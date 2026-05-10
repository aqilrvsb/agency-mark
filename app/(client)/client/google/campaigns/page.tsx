import { requireClient } from "@/lib/auth/guards";
import { loadBrandLevelData } from "@/lib/client-data/fetch-brand-data";
import { parseDateRange } from "@/lib/client-data/aggregate";
import { GoogleAATemplate } from "@/components/client/google-aa-template";

export const dynamic = "force-dynamic";

export default async function GoogleCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; ad_accounts?: string }>;
}) {
  const params = await searchParams;
  const { start, end } = parseDateRange(params);
  const adAccountIds = (params.ad_accounts ?? "").split(",").filter(Boolean);
  const user = await requireClient();
  const data = await loadBrandLevelData({
    userId: user.id,
    platforms: ["google_ads"],
    level: "campaign",
    start,
    end,
    adAccountIds,
  });

  return (
    <GoogleAATemplate
      level="campaign"
      brandName={data.brand?.name}
      range={data.range}
      totals={data.totals}
      priorTotals={data.priorTotals}
      deltas={data.deltas}
      daily={data.daily}
      dailyClicks={data.dailyClicks}
      rows={data.rows}
      brandId={data.brand?.id}
      adAccountOptions={data.adAccountOptions}
    />
  );
}
