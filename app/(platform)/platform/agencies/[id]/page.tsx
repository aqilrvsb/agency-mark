import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Building2, Key, RefreshCw, Users, Database } from "lucide-react";
import { AdzviserKeyForm } from "./adzviser-key-form";
import { SyncNowButton } from "./sync-now-button";

export default async function AgencyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!company) notFound();

  const [{ data: connection }, { data: brands }, { data: staff }, { data: syncs }] = await Promise.all([
    supabase.from("adzviser_connections").select("*").eq("company_id", id).maybeSingle(),
    supabase.from("brands").select("id, name, is_active").eq("company_id", id),
    supabase.from("users").select("id, email, full_name, role, is_active").eq("company_id", id),
    supabase.from("adzviser_sync_logs").select("*").eq("company_id", id).order("synced_at", { ascending: false }).limit(10),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-black" />
        </div>
        <div>
          <h1 className="font-display font-extrabold text-4xl">{company.name as string}</h1>
          <p className="text-[var(--color-text-secondary)] font-mono text-xs">{company.prefix as string}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatBox icon={Users} label="Staff" value={(staff ?? []).length} />
        <StatBox icon={Building2} label="Clients" value={(brands ?? []).length} />
        <StatBox icon={Database} label="BigQuery dataset" value={connection?.workspace_id ?? "Not configured"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> Adzviser configuration</CardTitle>
            <CardDescription>Set the API key + workspace mapping for this agency.</CardDescription>
          </CardHeader>
          <AdzviserKeyForm companyId={id} initial={connection} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><RefreshCw className="w-5 h-5" /> Manual sync</CardTitle>
            <CardDescription>Trigger BigQuery → Supabase sync for this agency.</CardDescription>
          </CardHeader>
          <SyncNowButton companyId={id} hasConfig={Boolean(connection?.workspace_id)} />
          <div className="mt-5">
            <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-2">Recent syncs</div>
            <div className="space-y-1">
              {(syncs ?? []).map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--color-border)] last:border-0">
                  <span className={`px-2 py-0.5 rounded font-mono uppercase ${s.status === "success" ? "bg-emerald-500/15 text-emerald-400" : s.status === "partial" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>
                    {s.status as string}
                  </span>
                  <span className="text-[var(--color-text-muted)]">{new Date(s.synced_at as string).toLocaleString("en-MY")}</span>
                </div>
              ))}
              {(syncs ?? []).length === 0 && (
                <div className="text-xs text-[var(--color-text-muted)] py-4 text-center">No syncs yet</div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <Card className="!p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold">{label}</div>
        <Icon className="w-4 h-4 text-[var(--color-text-muted)]" />
      </div>
      <div className="font-display font-bold text-xl truncate">{value}</div>
    </Card>
  );
}
