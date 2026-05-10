import { requireClient } from "@/lib/auth/guards";
import { loadBrandLevelData } from "@/lib/client-data/fetch-brand-data";
import { parseDateRange } from "@/lib/client-data/aggregate";
import { PlatformPageTemplate } from "@/components/client/platform-page-template";

export const dynamic = "force-dynamic";

export default async function TikTokAdsListPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const { start, end } = parseDateRange(params);
  const user = await requireClient();
  const data = await loadBrandLevelData({
    userId: user.id,
    platforms: ["tiktok_ads", "tiktok"],
    level: "ad",
    start,
    end,
  });

  return (
    <PlatformPageTemplate
      platformLabel="TikTok Ads"
      platformAccent="text-pink-300"
      level="ad"
      brandName={data.brand?.name}
      range={data.range}
      totals={data.totals}
      deltas={data.deltas}
      daily={data.daily}
      priorDaily={data.priorDaily}
      rows={data.rows}
    />
  );
}
