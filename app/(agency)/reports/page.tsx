import { createClient } from "@/lib/supabase/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { ReportExportButton } from "./export-button";
import { FileBarChart2, TrendingUp, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireAgencyStaff();
  const supabase = await createClient();

  // Last 30 days summary
  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const last30Iso = last30.toISOString().slice(0, 10);

  const [{ data: brands }, { data: adData }] = await Promise.all([
    supabase.from("brands").select("id, name").eq("company_id", user.company_id).eq("is_active", true),
    supabase
      .from("ad_data")
      .select("brand_id, platform, date_start, data")
      .eq("company_id", user.company_id)
      .gte("date_start", last30Iso),
  ]);

  // Aggregate per brand
  type BrandStat = { id: string; name: string; spend: number; impressions: number; clicks: number; conversions: number; platforms: Set<string> };
  const byBrand = new Map<string, BrandStat>();
  for (const b of brands ?? []) {
    byBrand.set(b.id as string, { id: b.id as string, name: b.name as string, spend: 0, impressions: 0, clicks: 0, conversions: 0, platforms: new Set() });
  }
  let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalConversions = 0;
  for (const row of adData ?? []) {
    const stat = byBrand.get(row.brand_id as string);
    if (!stat) continue;
    const d = row.data as Record<string, unknown>;
    const spend = Number(d.spend ?? 0);
    const imp = Number(d.impressions ?? 0);
    const clk = Number(d.clicks ?? 0);
    const conv = Number(d.conversions ?? d.results ?? 0);
    stat.spend += spend;
    stat.impressions += imp;
    stat.clicks += clk;
    stat.conversions += conv;
    stat.platforms.add(row.platform as string);
    totalSpend += spend;
    totalImpressions += imp;
    totalClicks += clk;
    totalConversions += conv;
  }

  const brandStats = [...byBrand.values()].sort((a, b) => b.spend - a.spend);
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-4xl mb-2">Reports & Export</h1>
          <p className="text-[var(--color-text-secondary)]">30-day performance summary across all clients. Export to CSV for client reporting.</p>
        </div>
        <ReportExportButton />
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="!p-5">
          <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-2">Total Spend</div>
          <div className="font-display font-extrabold text-2xl text-[var(--color-orange)]">RM {totalSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </Card>
        <Card className="!p-5">
          <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-2">Conversions</div>
          <div className="font-display font-extrabold text-2xl text-[var(--color-lime)]">{totalConversions.toLocaleString()}</div>
        </Card>
        <Card className="!p-5">
          <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-2">Avg CPA</div>
          <div className="font-display font-extrabold text-2xl text-[var(--color-amber)]">RM {avgCpa.toFixed(2)}</div>
        </Card>
        <Card className="!p-5">
          <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-2">Avg CTR</div>
          <div className="font-display font-extrabold text-2xl text-cyan-400">{avgCtr.toFixed(2)}%</div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Per-client breakdown</CardTitle>
          <CardDescription>Last 30 days, ranked by spend.</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left py-3 font-bold">Client</th>
                <th className="text-left py-3 font-bold">Platforms</th>
                <th className="text-right py-3 font-bold">Spend</th>
                <th className="text-right py-3 font-bold">Impressions</th>
                <th className="text-right py-3 font-bold">Clicks</th>
                <th className="text-right py-3 font-bold">CTR</th>
                <th className="text-right py-3 font-bold">Conv.</th>
                <th className="text-right py-3 font-bold">CPA</th>
              </tr>
            </thead>
            <tbody>
              {brandStats.length === 0 && (
                <tr><td colSpan={8} className="py-6 text-center text-[var(--color-text-muted)]">No data for last 30 days yet.</td></tr>
              )}
              {brandStats.map((b) => {
                const ctr = b.impressions > 0 ? (b.clicks / b.impressions) * 100 : 0;
                const cpa = b.conversions > 0 ? b.spend / b.conversions : 0;
                return (
                  <tr key={b.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 font-bold">{b.name}</td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {[...b.platforms].map((p) => {
                          const label = p === "meta_ads" || p === "meta" ? "FB" : p === "meta_insights" ? "FBI" : p === "google_ads" ? "G" : "TT";
                          const color = p === "meta_ads" || p === "meta" ? "bg-blue-500/15 text-blue-300" : p === "meta_insights" ? "bg-cyan-500/15 text-cyan-300" : p === "google_ads" ? "bg-amber-500/15 text-amber-300" : "bg-pink-500/15 text-pink-300";
                          return <span key={p} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`}>{label}</span>;
                        })}
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono">RM {b.spend.toFixed(2)}</td>
                    <td className="py-3 text-right font-mono">{b.impressions.toLocaleString()}</td>
                    <td className="py-3 text-right font-mono">{b.clicks.toLocaleString()}</td>
                    <td className="py-3 text-right font-mono">{ctr.toFixed(2)}%</td>
                    <td className="py-3 text-right font-mono">{b.conversions.toLocaleString()}</td>
                    <td className="py-3 text-right font-mono">{b.conversions > 0 ? `RM ${cpa.toFixed(2)}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileBarChart2 className="w-5 h-5" /> What's included in the export</CardTitle>
          </CardHeader>
          <ul className="space-y-2 text-sm text-[var(--color-text-secondary)] list-disc pl-5">
            <li>Per-client per-day breakdown (last 30 days)</li>
            <li>Spend, impressions, clicks, CTR, conversions, CPA</li>
            <li>Platform breakdown (FB Ads / FB Insights / Google Ads / TikTok Ads)</li>
            <li>Ready-to-share format — CSV opens in Excel, Sheets, or Numbers</li>
          </ul>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Tip</CardTitle>
          </CardHeader>
          <p className="text-sm text-[var(--color-text-secondary)]">
            For client meetings, share the CSV alongside their client portal link
            (<code className="text-xs">/client/overview</code>) so they can self-serve while you walk through the highlights.
          </p>
        </Card>
      </div>
    </div>
  );
}
