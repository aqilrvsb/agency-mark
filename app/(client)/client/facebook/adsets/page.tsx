import { requireClient } from "@/lib/auth/guards";
import { loadBrandLevelData } from "@/lib/client-data/fetch-brand-data";
import { parseDateRange } from "@/lib/client-data/aggregate";
import { FacebookAATemplate } from "@/components/client/facebook-aa-template";

export const dynamic = "force-dynamic";

export default async function FacebookAdSetsPage({
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
    platforms: ["meta_ads", "meta"],
    level: "adset",
    start,
    end,
    adAccountIds,
  });

  return (
    <FacebookAATemplate
      level="adset"
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
      clicksByAccount={data.clicksByAccount}
    />
  );
}
