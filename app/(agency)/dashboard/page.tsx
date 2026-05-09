import { createClient } from "@/lib/supabase/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { Card } from "@/components/ui/card";
import { Wallet, TrendingUp, Users, Target } from "lucide-react";
import Link from "next/link";

export default async function DashboardOverviewPage() {
  const user = await requireAgencyStaff();
  const supabase = await createClient();

  if (!user.company_id) {
    return (
      <div className="p-8">
        <p>No company assigned. Contact platform admin.</p>
      </div>
    );
  }

  // Aggregate today's performance across this agency's clients
  const today = new Date().toISOString().slice(0, 10);
  const last7 = new Date();
  last7.setDate(last7.getDate() - 7);
  const last7Iso = last7.toISOString().slice(0, 10);

  const [{ data: brands }, { data: adData }, { data: alerts }] = await Promise.all([
    supabase.from("brands").select("id, name").eq("company_id", user.company_id).eq("is_active", true),
    supabase
      .from("ad_data")
      .select("brand_id, platform, date_start, data")
      .eq("company_id", user.company_id)
      .gte("date_start", last7Iso),
    supabase.from("alert_history").select("id").eq("company_id", user.company_id).eq("is_read", false),
  ]);

  // Aggregate metrics
  let totalSpend = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  for (const row of adData ?? []) {
    const d = row.data as Record<string, unknown>;
    totalSpend += Number(d.spend ?? 0);
    totalImpressions += Number(d.impressions ?? 0);
    totalClicks += Number(d.clicks ?? 0);
    totalConversions += Number(d.conversions ?? d.results ?? 0);
  }
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0";
  const avgCpa = totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : "—";

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Welcome back, {user.full_name.split(" ")[0]}</h1>
        <p className="text-[var(--color-text-secondary)]">
          Overview untuk 7 hari terakhir · {brands?.length ?? 0} clients aktif
        </p>
      </header>

      {(alerts?.length ?? 0) > 0 && (
        <Card className="mb-6 !border-amber-500/30 !bg-amber-500/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-amber-300">{alerts!.length} alert(s) baru</div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                KPI ada yang melampaui threshold. Click untuk review.
              </div>
            </div>
            <Link href="/analytics" className="text-sm font-bold text-amber-400 hover:underline">View →</Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI icon={Wallet} label="Spend (7d)" value={`RM ${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} color="orange" />
        <KPI icon={TrendingUp} label="Impressions" value={totalImpressions.toLocaleString()} color="lime" />
        <KPI icon={Target} label="CTR" value={`${avgCtr}%`} color="amber" />
        <KPI icon={Users} label="CPA avg" value={avgCpa === "—" ? avgCpa : `RM ${avgCpa}`} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <h2 className="font-display font-bold text-xl mb-4">Top clients (by spend)</h2>
            <div className="space-y-2">
              {(brands ?? []).slice(0, 8).map((b) => {
                const brandSpend = (adData ?? [])
                  .filter((r) => r.brand_id === b.id)
                  .reduce((sum, r) => sum + Number((r.data as Record<string, unknown>).spend ?? 0), 0);
                return (
                  <Link
                    key={b.id as string}
                    href={`/clients/${b.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition"
                  >
                    <span className="font-medium">{b.name as string}</span>
                    <span className="font-mono text-sm text-[var(--color-orange)]">
                      RM {brandSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </Link>
                );
              })}
              {(brands ?? []).length === 0 && (
                <Link href="/clients" className="block text-center py-8 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                  No clients yet → click here to add your first
                </Link>
              )}
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="font-display font-bold text-xl mb-4">Quick actions</h2>
          <div className="space-y-2">
            <Link href="/clients" className="block p-3 rounded-xl bg-[var(--color-bg-soft)] hover:bg-white/5 transition text-sm font-medium">
              📋 Manage clients
            </Link>
            <Link href="/campaigns" className="block p-3 rounded-xl bg-[var(--color-bg-soft)] hover:bg-white/5 transition text-sm font-medium">
              📊 View campaigns
            </Link>
            <Link href="/analytics" className="block p-3 rounded-xl bg-[var(--color-bg-soft)] hover:bg-white/5 transition text-sm font-medium">
              📈 Open analytics
            </Link>
            <Link href="/invoices" className="block p-3 rounded-xl bg-[var(--color-bg-soft)] hover:bg-white/5 transition text-sm font-medium">
              💳 Invoices
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, color }: { icon: typeof Wallet; label: string; value: string; color: string }) {
  const map: Record<string, string> = {
    orange: "var(--color-orange)",
    lime: "var(--color-lime)",
    amber: "var(--color-amber)",
    emerald: "var(--color-emerald)",
  };
  return (
    <Card className="!p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold">{label}</div>
        <Icon className="w-4 h-4" style={{ color: map[color] }} />
      </div>
      <div className="font-display font-extrabold text-2xl" style={{ color: map[color] }}>{value}</div>
    </Card>
  );
}
