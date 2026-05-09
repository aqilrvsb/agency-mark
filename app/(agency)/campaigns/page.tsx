import { createClient } from "@/lib/supabase/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { Card } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";

export default async function CampaignsPage() {
  const user = await requireAgencyStaff();
  const supabase = await createClient();
  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);

  const { data: rows } = await supabase
    .from("ad_data")
    .select("date_start, platform, brand_id, data, brands:brands(name)")
    .eq("company_id", user.company_id)
    .gte("date_start", last30.toISOString().slice(0, 10))
    .order("date_start", { ascending: false })
    .limit(200);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Campaigns</h1>
        <p className="text-[var(--color-text-secondary)]">Last 30 days of ad performance across all clients.</p>
      </header>

      <Card className="!p-0 !border-0 !bg-transparent">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Date</TableHeader>
              <TableHeader>Client</TableHeader>
              <TableHeader>Platform</TableHeader>
              <TableHeader>Campaign</TableHeader>
              <TableHeader>Spend</TableHeader>
              <TableHeader>Impressions</TableHeader>
              <TableHeader>CTR</TableHeader>
              <TableHeader>ROAS</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(rows ?? []).map((r, i) => {
              const d = r.data as Record<string, unknown>;
              const spend = Number(d.spend ?? 0);
              const impressions = Number(d.impressions ?? 0);
              const clicks = Number(d.clicks ?? 0);
              const revenue = Number(d.purchase_value ?? d.action_values_purchase ?? 0);
              const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0";
              const roas = spend > 0 ? (revenue / spend).toFixed(2) : "—";
              const brandName = (r.brands as { name: string } | null)?.name ?? "—";
              return (
                <TableRow key={i}>
                  <TableCell className="text-xs">{r.date_start as string}</TableCell>
                  <TableCell className="font-medium">{brandName}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.platform === "meta" ? "bg-blue-500/15 text-blue-300" : "bg-pink-500/15 text-pink-300"}`}>
                      {r.platform === "meta" ? "FB" : "TT"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{(d.campaign_name as string) || "—"}</TableCell>
                  <TableCell className="font-mono">RM {spend.toFixed(2)}</TableCell>
                  <TableCell className="font-mono">{impressions.toLocaleString()}</TableCell>
                  <TableCell className="font-mono">{ctr}%</TableCell>
                  <TableCell className={`font-mono font-bold ${Number(roas) >= 3 ? "text-emerald-400" : Number(roas) >= 1 ? "text-amber-400" : "text-red-400"}`}>
                    {roas === "—" ? roas : `${roas}x`}
                  </TableCell>
                </TableRow>
              );
            })}
            {(rows ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-[var(--color-text-muted)]">
                  No campaign data yet. Wait for next BigQuery sync.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
