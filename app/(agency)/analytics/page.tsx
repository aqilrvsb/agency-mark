import { createClient } from "@/lib/supabase/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";

export default async function AnalyticsPage() {
  const user = await requireAgencyStaff();
  const supabase = await createClient();

  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const startIso = last30.toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from("ad_data")
    .select("date_start, platform, data")
    .eq("company_id", user.company_id)
    .gte("date_start", startIso);

  // Aggregate daily across all platforms
  const byDay = new Map<string, { spend: number; conversions: number; impressions: number }>();
  for (const r of rows ?? []) {
    const d = r.data as Record<string, unknown>;
    const day = r.date_start as string;
    const cur = byDay.get(day) ?? { spend: 0, conversions: 0, impressions: 0 };
    cur.spend += Number(d.spend ?? 0);
    cur.conversions += Number(d.conversions ?? d.results ?? 0);
    cur.impressions += Number(d.impressions ?? 0);
    byDay.set(day, cur);
  }
  const days = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const maxSpend = Math.max(...days.map(d => d[1].spend), 1);

  const totalSpend = days.reduce((s, d) => s + d[1].spend, 0);
  const totalConv = days.reduce((s, d) => s + d[1].conversions, 0);
  const cpa = totalConv > 0 ? totalSpend / totalConv : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Analytics</h1>
        <p className="text-[var(--color-text-secondary)]">Last 30 days — aggregate across all clients + platforms.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="!p-5">
          <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-2">Total spend</div>
          <div className="font-display font-extrabold text-3xl text-[var(--color-orange)]">RM {totalSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </Card>
        <Card className="!p-5">
          <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-2">Total conversions</div>
          <div className="font-display font-extrabold text-3xl text-[var(--color-lime)]">{totalConv.toLocaleString()}</div>
        </Card>
        <Card className="!p-5">
          <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-2">Avg CPA</div>
          <div className="font-display font-extrabold text-3xl text-[var(--color-amber)]">RM {cpa.toFixed(2)}</div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily spend trend</CardTitle>
          <CardDescription>Last 30 days · all clients · all platforms</CardDescription>
        </CardHeader>
        <div className="space-y-1.5">
          {days.map(([day, m]) => {
            const pct = (m.spend / maxSpend) * 100;
            return (
              <div key={day} className="flex items-center gap-3 text-xs">
                <div className="w-20 text-[var(--color-text-muted)] font-mono">{day.slice(5)}</div>
                <div className="flex-1 h-7 rounded-md bg-[var(--color-bg-soft)] relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 rounded-md transition-all"
                    style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--color-orange) 0%, var(--color-amber) 100%)" }} />
                  <div className="absolute inset-0 flex items-center px-2 text-xs font-mono font-bold">
                    RM {m.spend.toFixed(0)}
                  </div>
                </div>
              </div>
            );
          })}
          {days.length === 0 && (
            <div className="text-center py-12 text-[var(--color-text-muted)]">
              No data yet. Wait for first sync.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
