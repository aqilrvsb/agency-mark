import { createClient } from "@/lib/supabase/server";
import { requireClient } from "@/lib/auth/guards";
import { Card } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";

export default async function ClientCampaignsPage() {
  const user = await requireClient();
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands").select("id, name").eq("assigned_client_user_id", user.id).maybeSingle();

  if (!brand) return <div className="p-8">No brand assigned.</div>;

  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const { data: rows } = await supabase
    .from("ad_data")
    .select("date_start, platform, data")
    .eq("brand_id", brand.id)
    .gte("date_start", last30.toISOString().slice(0, 10))
    .order("date_start", { ascending: false })
    .limit(100);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Campaigns</h1>
        <p className="text-[var(--color-text-secondary)]">{(brand.name as string)} · Last 30 days</p>
      </header>

      <Card className="!p-0 !border-0 !bg-transparent">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Date</TableHeader>
              <TableHeader>Platform</TableHeader>
              <TableHeader>Campaign</TableHeader>
              <TableHeader>Spend</TableHeader>
              <TableHeader>Impressions</TableHeader>
              <TableHeader>Clicks</TableHeader>
              <TableHeader>CTR</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(rows ?? []).map((r, i) => {
              const d = r.data as Record<string, unknown>;
              const spend = Number(d.spend ?? 0);
              const impressions = Number(d.impressions ?? 0);
              const clicks = Number(d.clicks ?? 0);
              const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0";
              return (
                <TableRow key={i}>
                  <TableCell className="text-xs">{r.date_start as string}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.platform === "meta" ? "bg-blue-500/15 text-blue-300" : "bg-pink-500/15 text-pink-300"}`}>
                      {r.platform === "meta" ? "FB" : "TT"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{(d.campaign_name as string) || "—"}</TableCell>
                  <TableCell className="font-mono">RM {spend.toFixed(2)}</TableCell>
                  <TableCell className="font-mono">{impressions.toLocaleString()}</TableCell>
                  <TableCell className="font-mono">{clicks.toLocaleString()}</TableCell>
                  <TableCell className="font-mono">{ctr}%</TableCell>
                </TableRow>
              );
            })}
            {(rows ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[var(--color-text-muted)]">
                  Tiada data campaign lagi.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
