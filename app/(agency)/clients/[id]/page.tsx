import { createClient } from "@/lib/supabase/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { notFound } from "next/navigation";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Building2, Wallet, BarChart3 } from "lucide-react";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAgencyStaff();
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("id", id)
    .eq("company_id", user.company_id)
    .maybeSingle();

  if (!brand) notFound();

  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const last30Iso = last30.toISOString().slice(0, 10);

  const [{ data: adAccounts }, { data: adData }, { data: budget }] = await Promise.all([
    supabase.from("brand_ad_accounts").select("*").eq("brand_id", id),
    supabase.from("ad_data").select("platform, date_start, data").eq("brand_id", id).gte("date_start", last30Iso).order("date_start", { ascending: false }),
    supabase.from("client_budgets").select("*").eq("brand_id", id).maybeSingle(),
  ]);

  let spend30 = 0, conversions30 = 0, impressions30 = 0;
  for (const row of adData ?? []) {
    const d = row.data as Record<string, unknown>;
    spend30 += Number(d.spend ?? 0);
    conversions30 += Number(d.conversions ?? d.results ?? 0);
    impressions30 += Number(d.impressions ?? 0);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-black" />
        </div>
        <div>
          <h1 className="font-display font-extrabold text-4xl">{brand.name as string}</h1>
          <p className="text-[var(--color-text-secondary)] text-sm">
            {(brand.contact_email as string) || "No contact email"} · {(brand.contact_phone as string) || "No phone"}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="!p-5">
          <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-2">Spend (30d)</div>
          <div className="font-display font-extrabold text-2xl text-[var(--color-orange)]">RM {spend30.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </Card>
        <Card className="!p-5">
          <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-2">Conversions</div>
          <div className="font-display font-extrabold text-2xl text-[var(--color-lime)]">{conversions30.toLocaleString()}</div>
        </Card>
        <Card className="!p-5">
          <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-2">Impressions</div>
          <div className="font-display font-extrabold text-2xl text-[var(--color-amber)]">{impressions30.toLocaleString()}</div>
        </Card>
        <Card className="!p-5">
          <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-2">Budget</div>
          <div className="font-display font-extrabold text-2xl text-emerald-400">
            RM {Number(budget?.current_balance_myr ?? 0).toLocaleString()}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Connected ad accounts</CardTitle>
            <CardDescription>Master admin needs to add these to Adzviser workspace.</CardDescription>
          </CardHeader>
          <div className="space-y-2">
            {(adAccounts ?? []).map((a) => (
              <div key={a.id as string} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-bg-soft)]">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${a.platform === "meta" ? "bg-blue-500/15 text-blue-300" : "bg-pink-500/15 text-pink-300"}`}>
                    {a.platform === "meta" ? "FB" : "TT"}
                  </span>
                  <code className="text-xs">{a.external_account_id as string}</code>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {(a.external_account_name as string) || "—"}
                </span>
              </div>
            ))}
            {(adAccounts ?? []).length === 0 && (
              <div className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                No ad accounts connected yet. Contact admin to add via Adzviser.
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Recent ad data</CardTitle>
            <CardDescription>Daily snapshots from Adzviser → BigQuery → Supabase.</CardDescription>
          </CardHeader>
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
                No data yet. Wait for next sync.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
