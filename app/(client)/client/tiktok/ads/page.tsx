import { requireClient } from "@/lib/auth/guards";
import { loadBrandLevelData } from "@/lib/client-data/fetch-brand-data";
import { parseDateRange } from "@/lib/client-data/aggregate";
import { TikTokAATemplate } from "@/components/client/tiktok-aa-template";

export const dynamic = "force-dynamic";

export default async function TikTokAdsListPage({
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
    platforms: ["tiktok_ads", "tiktok"],
    level: "ad",
    start,
    end,
    adAccountIds,
  });

  return (
    <TikTokAATemplate
      level="ad"
      brandName={data.brand?.name}
      range={data.range}
      totals={data.totals}
      daily={data.daily}
      dailyImpressions={data.dailyImpressions}
      rows={data.rows}
      brandId={data.brand?.id}
      adAccountOptions={data.adAccountOptions}
    />
  );
}
