import { requireAgencyStaff } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const user = await requireAgencyStaff();
  const supabase = await createClient();

  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const last30Iso = last30.toISOString().slice(0, 10);

  const [{ data: brands }, { data: adData }] = await Promise.all([
    supabase.from("brands").select("id, name").eq("company_id", user.company_id),
    supabase
      .from("ad_data")
      .select("brand_id, platform, date_start, data")
      .eq("company_id", user.company_id)
      .gte("date_start", last30Iso)
      .order("date_start", { ascending: false }),
  ]);

  const brandName = new Map<string, string>();
  for (const b of brands ?? []) brandName.set(b.id as string, b.name as string);

  const headers = ["date", "client", "platform", "spend", "impressions", "clicks", "ctr", "conversions", "cpa"];
  const rows: string[] = [headers.join(",")];

  for (const row of adData ?? []) {
    const d = row.data as Record<string, unknown>;
    const spend = Number(d.spend ?? 0);
    const imp = Number(d.impressions ?? 0);
    const clk = Number(d.clicks ?? 0);
    const conv = Number(d.conversions ?? d.results ?? 0);
    const ctr = imp > 0 ? ((clk / imp) * 100).toFixed(2) : "0";
    const cpa = conv > 0 ? (spend / conv).toFixed(2) : "0";
    rows.push([
      row.date_start,
      brandName.get(row.brand_id as string) ?? "(unknown)",
      row.platform,
      spend.toFixed(2),
      imp,
      clk,
      ctr,
      conv,
      cpa,
    ].map(escapeCsv).join(","));
  }

  return new Response(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="adsolution-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
