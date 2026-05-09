import { requireClient } from "@/lib/auth/guards";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { MetricsTable, MetricsSummary } from "@/components/client/metrics-table";
import { DateRangePicker } from "@/components/client/date-range-picker";
import { loadBrandLevelData } from "@/lib/client-data/fetch-brand-data";
import { parseDateRange } from "@/lib/client-data/aggregate";
import { Layers } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FacebookAdSetsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const { start, end } = parseDateRange(params);
  const user = await requireClient();
  const { brand, rows, totals } = await loadBrandLevelData({
    userId: user.id,
    platforms: ["meta_ads", "meta"],
    level: "adset",
    start,
    end,
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <div className="text-xs uppercase tracking-widest text-blue-300 font-bold mb-2">Facebook Ads</div>
        <h1 className="font-display font-extrabold text-4xl mb-2">Ad Sets</h1>
        <p className="text-[var(--color-text-secondary)]">
          {brand?.name ? `${brand.name}'s ` : ""}targeting + budget breakdown from {start} to {end}.
        </p>
      </header>

      <div className="mb-6"><DateRangePicker /></div>
      {totals && <MetricsSummary {...totals} />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5" /> All ad sets</CardTitle>
          <CardDescription>Each ad set groups ads by audience + budget. Ranked by spend.</CardDescription>
        </CardHeader>
        <MetricsTable rows={rows} nameLabel="Ad set" />
      </Card>
    </div>
  );
}
