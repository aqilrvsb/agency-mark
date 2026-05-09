import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Users, Wallet, Activity, TrendingUp } from "lucide-react";

export default async function PlatformOverviewPage() {
  const supabase = await createClient();

  const [agencies, users, subs, syncs] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }).neq("role", "platform_admin"),
    supabase.from("agency_subscriptions").select("id, monthly_price_myr, status").eq("status", "active"),
    supabase.from("adzviser_sync_logs").select("status, synced_at").order("synced_at", { ascending: false }).limit(20),
  ]);

  const totalMRR = (subs.data ?? []).reduce((sum, s) => sum + Number(s.monthly_price_myr), 0);
  const successSyncs = (syncs.data ?? []).filter((s) => s.status === "success").length;
  const failedSyncs = (syncs.data ?? []).filter((s) => s.status === "failed").length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Platform Overview</h1>
        <p className="text-[var(--color-text-secondary)]">Master admin view across all agencies.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat icon={Building2} label="Total Agencies" value={agencies.count ?? 0} color="orange" />
        <Stat icon={Users} label="Total Users" value={users.count ?? 0} color="lime" />
        <Stat icon={Wallet} label="Active MRR (RM)" value={totalMRR.toLocaleString()} color="amber" />
        <Stat icon={Activity} label="Last 20 Syncs" value={`${successSyncs} ✓ / ${failedSyncs} ✗`} color="emerald" />
      </div>

      <Card>
        <CardTitle>Recent sync activity</CardTitle>
        <CardDescription>Last 20 BigQuery sync runs across all agencies.</CardDescription>
        <div className="mt-4 space-y-2">
          {(syncs.data ?? []).slice(0, 10).map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-[var(--color-border)] last:border-0">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${s.status === "success" ? "bg-emerald-400" : s.status === "partial" ? "bg-amber-400" : "bg-red-400"}`} />
                <span className="font-mono text-xs uppercase">{s.status}</span>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">
                {new Date(s.synced_at as string).toLocaleString("en-MY")}
              </span>
            </div>
          ))}
          {(syncs.data ?? []).length === 0 && (
            <div className="text-center text-sm text-[var(--color-text-muted)] py-8">
              No sync activity yet. Onboard your first agency to start.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: typeof TrendingUp; label: string; value: string | number; color: "orange" | "lime" | "amber" | "emerald" }) {
  const colorMap = {
    orange: "var(--color-orange)",
    lime: "var(--color-lime)",
    amber: "var(--color-amber)",
    emerald: "var(--color-emerald)",
  };
  return (
    <Card className="!p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold">{label}</div>
        <Icon className="w-4 h-4" style={{ color: colorMap[color] }} />
      </div>
      <div className="font-display font-extrabold text-3xl" style={{ color: colorMap[color] }}>
        {value}
      </div>
    </Card>
  );
}
