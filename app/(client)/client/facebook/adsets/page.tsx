import { requireClient } from "@/lib/auth/guards";
import { loadBrandLevelData } from "@/lib/client-data/fetch-brand-data";
import { parseDateRange } from "@/lib/client-data/aggregate";
import { PlatformPageTemplate } from "@/components/client/platform-page-template";

export const dynamic = "force-dynamic";

export default async function FacebookAdSetsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const { start, end } = parseDateRange(params);
  const user = await requireClient();
  const data = await loadBrandLevelData({
    userId: user.id,
    platforms: ["meta_ads", "meta"],
    level: "adset",
    start,
    end,
  });

  return (
    <PlatformPageTemplate
      platformLabel="Facebook Ads"
      platformAccent="text-blue-300"
      level="adset"
      brandName={data.brand?.name}
      range={data.range}
      totals={data.totals}
      deltas={data.deltas}
      daily={data.daily}
      priorDaily={data.priorDaily}
      rows={data.rows}
      annotations={data.annotations}
      brandId={data.brand?.id}
    />
  );
}
