import { createClient } from "@/lib/supabase/server";
import { requireClient } from "@/lib/auth/guards";
import { Card } from "@/components/ui/card";
import { Wallet, TrendingUp, Target, BarChart3 } from "lucide-react";

export default async function ClientOverviewPage() {
  const user = await requireClient();
  const supabase = await createClient();

  // Find brand assigned to this client user
  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("assigned_client_user_id", user.id)
    .maybeSingle();

  if (!brand) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Card className="text-center py-12">
          <h1 className="font-display font-bold text-2xl mb-3">No brand assigned yet</h1>
          <p className="text-[var(--color-text-secondary)]">
            Your agency hasn&apos;t connected your data yet. Hubungi mereka untuk mula tracking.
          </p>
        </Card>
      </div>
    );
  }

  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const startIso = last30.toISOString().slice(0, 10);

  const [{ data: adData }, { data: budget }] = await Promise.all([
    supabase.from("ad_data").select("date_start, platform, data").eq("brand_id", brand.id).gte("date_start", startIso),
    supabase.from("client_budgets").select("*").eq("brand_id", brand.id).maybeSingle(),
  ]);

  let spend30 = 0, conversions30 = 0, revenue30 = 0, impressions30 = 0;
  for (const r of adData ?? []) {
    const d = r.data as Record<string, unknown>;
    spend30 += Number(d.spend ?? 0);
    conversions30 += Number(d.conversions ?? d.results ?? 0);
    revenue30 += Number(d.purchase_value ?? d.action_values_purchase ?? 0);
    impressions30 += Number(d.impressions ?? 0);
  }
  const roas = spend30 > 0 ? (revenue30 / spend30).toFixed(2) : "—";

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">{brand.name as string}</h1>
        <p className="text-[var(--color-text-secondary)]">
          Performance dashboard · 30 hari terakhir
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="!p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold">Spend</div>
            <Wallet className="w-4 h-4 text-[var(--color-orange)]" />
          </div>
          <div className="font-display font-extrabold text-2xl text-[var(--color-orange)]">
            RM {spend30.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </Card>
        <Card className="!p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold">Conversions</div>
            <Target className="w-4 h-4 text-[var(--color-lime)]" />
          </div>
          <div className="font-display font-extrabold text-2xl text-[var(--color-lime)]">
            {conversions30.toLocaleString()}
          </div>
        </Card>
        <Card className="!p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold">ROAS</div>
            <TrendingUp className="w-4 h-4 text-[var(--color-amber)]" />
          </div>
          <div className="font-display font-extrabold text-2xl text-[var(--color-amber)]">
            {roas === "—" ? roas : `${roas}x`}
          </div>
        </Card>
        <Card className="!p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold">Impressions</div>
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-display font-extrabold text-2xl text-emerald-400">
            {impressions30.toLocaleString()}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-display font-bold text-xl mb-4">Budget</h2>
          <div className="text-center py-6">
            <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-2">Current balance</div>
            <div className="font-display font-extrabold text-5xl text-[var(--color-lime)] mb-2">
              RM {Number(budget?.current_balance_myr ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              Total topup: RM {Number(budget?.total_topup_myr ?? 0).toLocaleString()} ·
              Spent: RM {Number(budget?.total_spent_myr ?? 0).toLocaleString()}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-display font-bold text-xl mb-4">Recent activity</h2>
          <div className="space-y-1.5">
            {(adData ?? []).slice(0, 8).map((row, i) => {
              const d = row.data as Record<string, unknown>;
              return (
                <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-[var(--color-border)] last:border-0">
                  <span className="text-[var(--color-text-muted)]">{row.date_start as string}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${row.platform === "meta" ? "bg-blue-500/15 text-blue-300" : "bg-pink-500/15 text-pink-300"}`}>
                    {row.platform as string}
                  </span>
                  <span className="font-mono">RM {Number(d.spend ?? 0).toFixed(2)}</span>
                </div>
              );
            })}
            {(adData ?? []).length === 0 && (
              <div className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                Tiada data lagi.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
