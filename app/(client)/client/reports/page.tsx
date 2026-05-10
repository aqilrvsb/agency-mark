import { createClient } from "@/lib/supabase/server";
import { requireClient } from "@/lib/auth/guards";
import { Card, CardTitle, CardHeader, CardDescription } from "@/components/ui/card";

export default async function ClientReportsPage() {
  const user = await requireClient();
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands").select("id, name").eq("assigned_client_user_id", user.id).maybeSingle();
  if (!brand) return <div className="p-8">No brand assigned.</div>;

  const last90 = new Date();
  last90.setDate(last90.getDate() - 90);
  const { data: rows } = await supabase
    .from("ad_data")
    .select("date_start, platform, data")
    .eq("brand_id", brand.id)
    .gte("date_start", last90.toISOString().slice(0, 10));

  // Group by month
  const monthly = new Map<string, { spend: number; conversions: number; revenue: number }>();
  for (const r of rows ?? []) {
    const month = (r.date_start as string).slice(0, 7);
    const cur = monthly.get(month) ?? { spend: 0, conversions: 0, revenue: 0 };
    const d = r.data as Record<string, unknown>;
    cur.spend += Number(d.spend ?? 0);
    cur.conversions += Number(d.conversions ?? d.results ?? 0);
    cur.revenue += Number(d.purchase_value ?? d.action_values_purchase ?? 0);
    monthly.set(month, cur);
  }
  const months = Array.from(monthly.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl mb-2">Reports</h1>
        <p className="text-[var(--color-text-secondary)]">{brand.name as string} · Monthly summary</p>
      </header>

      <div className="space-y-4">
        {months.map(([month, m]) => {
          const roas = m.spend > 0 ? (m.revenue / m.spend).toFixed(2) : "—";
          const cpa = m.conversions > 0 ? (m.spend / m.conversions).toFixed(2) : "—";
          return (
            <Card key={month}>
              <CardHeader>
                <CardTitle>{new Date(month + "-01").toLocaleString("en-MY", { year: "numeric", month: "long" })}</CardTitle>
                <CardDescription>{month}</CardDescription>
              </CardHeader>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat label="Spend" value={`RM ${m.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} color="orange" />
                <Stat label="Conversions" value={m.conversions.toLocaleString()} color="lime" />
                <Stat label="Revenue" value={`RM ${m.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} color="emerald" />
                <Stat label="ROAS" value={roas === "—" ? roas : `${roas}x`} color="amber" />
              </div>
              <div className="mt-3 text-xs text-[var(--color-text-muted)]">
                CPA: <strong>{cpa === "—" ? "—" : `RM ${cpa}`}</strong>
              </div>
            </Card>
          );
        })}
        {months.length === 0 && (
          <Card className="text-center py-12 text-[var(--color-text-muted)]">
            Tiada report data lagi.
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  const map: Record<string, string> = {
    orange: "var(--color-orange)",
    lime: "var(--color-lime)",
    amber: "var(--color-amber)",
    emerald: "var(--color-emerald)",
  };
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-1">{label}</div>
      <div className="font-display font-bold text-xl" style={{ color: map[color] }}>{value}</div>
    </div>
  );
}
