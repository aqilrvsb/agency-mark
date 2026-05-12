import { createClient } from "@/lib/supabase/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { aggregateAdData, summarize } from "@/lib/client-data/aggregate";
import { notFound } from "next/navigation";
import { PrintTrigger } from "./print-trigger";

export const dynamic = "force-dynamic";

const fmtMyr = (n: number) =>
  `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtInt = (n: number) => n.toLocaleString();
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

function isoMinusDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function PrintReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ brandId: string }>;
  searchParams: Promise<{ days?: string; auto?: string }>;
}) {
  const { brandId } = await params;
  const sp = await searchParams;
  const days = Math.min(90, Math.max(7, Number(sp.days ?? 30)));
  const user = await requireAgencyStaff();
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, contact_email, contact_phone, company_id, companies(name, logo_url)")
    .eq("id", brandId)
    .eq("company_id", user.company_id!)
    .maybeSingle();
  if (!brand) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const start = isoMinusDays(today, days - 1);
  const priorEnd = isoMinusDays(start, 1);
  const priorStart = isoMinusDays(priorEnd, days - 1);

  const [{ data: currData }, { data: priorData }, { data: budget }] = await Promise.all([
    supabase
      .from("ad_data")
      .select("platform, date_start, data")
      .eq("brand_id", brandId)
      .gte("date_start", start)
      .lte("date_start", today),
    supabase
      .from("ad_data")
      .select("platform, date_start, data")
      .eq("brand_id", brandId)
      .gte("date_start", priorStart)
      .lte("date_start", priorEnd),
    supabase.from("client_budgets").select("*").eq("brand_id", brandId).maybeSingle(),
  ]);

  const allRows = aggregateAdData(currData ?? [], "campaign");
  const totals = summarize(allRows);
  const priorTotals = summarize(aggregateAdData(priorData ?? [], "campaign"));
  const top10 = allRows.slice(0, 10);

  const pct = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const agencyName = (brand as { companies?: { name?: string; logo_url?: string } | null }).companies?.name ?? "Your Agency";

  return (
    <div className="bg-white text-black min-h-screen p-10 print:p-0 print:bg-white">
      <PrintTrigger auto={sp.auto === "1"} />

      <style>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto print:max-w-none">
        {/* Cover header */}
        <header className="border-b-2 border-black pb-4 mb-6 flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-1">
              {agencyName}
            </div>
            <h1 className="text-3xl font-extrabold">{brand.name as string}</h1>
            <div className="text-sm text-gray-600 mt-0.5">
              Performance Report · {start} to {today} ({days} days)
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            Generated {new Date().toLocaleString()}<br />
            {(brand.contact_email as string) ?? ""}
          </div>
        </header>

        {/* Print + close buttons (hidden on print) */}
        <div className="no-print flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-black text-white font-bold text-sm"
          >
            Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="px-4 py-2 rounded-lg bg-gray-200 text-black font-bold text-sm"
          >
            Close
          </button>
        </div>

        {/* KPI grid */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-3 border-b border-gray-200 pb-1">
            Key Metrics
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <KPI label="Spend" value={fmtMyr(totals.spend)} delta={pct(totals.spend, priorTotals.spend)} lowerIsBetter />
            <KPI label="Revenue" value={fmtMyr(totals.revenue)} delta={pct(totals.revenue, priorTotals.revenue)} />
            <KPI
              label="ROAS"
              value={totals.roas > 0 ? `${totals.roas.toFixed(2)}×` : "—"}
              delta={pct(totals.roas, priorTotals.roas)}
            />
            <KPI label="Impressions" value={fmtInt(totals.impressions)} delta={pct(totals.impressions, priorTotals.impressions)} />
            <KPI label="Clicks" value={fmtInt(totals.clicks)} delta={pct(totals.clicks, priorTotals.clicks)} />
            <KPI label="CTR" value={fmtPct(totals.ctr)} delta={pct(totals.ctr, priorTotals.ctr)} />
            <KPI label="Conversions" value={fmtInt(totals.conversions)} delta={pct(totals.conversions, priorTotals.conversions)} />
            <KPI
              label="CPA"
              value={totals.conversions > 0 ? fmtMyr(totals.cpa) : "—"}
              delta={pct(totals.cpa, priorTotals.cpa)}
              lowerIsBetter
            />
            <KPI label="Conv. Rate" value={fmtPct(totals.conversionRate)} delta={pct(totals.conversionRate, priorTotals.conversionRate)} />
          </div>
        </section>

        {/* Budget */}
        {budget && (
          <section className="mb-6">
            <h2 className="text-lg font-bold mb-3 border-b border-gray-200 pb-1">Budget</h2>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">
                  Current balance
                </div>
                <div className="text-xl font-bold">{fmtMyr(Number(budget.current_balance_myr ?? 0))}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">
                  Total topup
                </div>
                <div className="text-xl font-bold">{fmtMyr(Number(budget.total_topup_myr ?? 0))}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">
                  Total spent
                </div>
                <div className="text-xl font-bold">{fmtMyr(Number(budget.total_spent_myr ?? 0))}</div>
              </div>
            </div>
          </section>
        )}

        {/* Top campaigns */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-3 border-b border-gray-200 pb-1">
            Top Campaigns by Spend
          </h2>
          {top10.length === 0 ? (
            <div className="text-sm text-gray-500 py-6 text-center border border-gray-200 rounded">
              No campaigns recorded in this period.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b-2 border-gray-300">
                <tr className="text-left text-[10px] uppercase tracking-widest text-gray-500">
                  <th className="py-2 font-bold">Campaign</th>
                  <th className="py-2 font-bold text-right">Spend</th>
                  <th className="py-2 font-bold text-right">Impr.</th>
                  <th className="py-2 font-bold text-right">CTR</th>
                  <th className="py-2 font-bold text-right">Conv.</th>
                  <th className="py-2 font-bold text-right">CPA</th>
                  <th className="py-2 font-bold text-right">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {top10.map((r) => (
                  <tr key={r.key} className="border-b border-gray-200">
                    <td className="py-2 font-bold truncate max-w-xs">{r.name}</td>
                    <td className="py-2 text-right font-mono">{fmtMyr(r.spend)}</td>
                    <td className="py-2 text-right font-mono">{fmtInt(r.impressions)}</td>
                    <td className="py-2 text-right font-mono">{fmtPct(r.ctr)}</td>
                    <td className="py-2 text-right font-mono">{r.conversions}</td>
                    <td className="py-2 text-right font-mono">{r.conversions > 0 ? fmtMyr(r.cpa) : "—"}</td>
                    <td className="py-2 text-right font-mono font-bold">
                      {r.roas > 0 ? `${r.roas.toFixed(2)}×` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-12 pt-4 border-t border-gray-200 text-[10px] text-gray-400 flex justify-between">
          <span>Generated by PeningAds.my for {agencyName}</span>
          <span>Page 1 / 1</span>
        </footer>
      </div>
    </div>
  );
}

function KPI({ label, value, delta, lowerIsBetter = false }: { label: string; value: string; delta: number; lowerIsBetter?: boolean }) {
  const isNeutral = Math.abs(delta) < 0.5;
  const isGood = lowerIsBetter ? delta < 0 : delta > 0;
  const symbol = isNeutral ? "—" : delta > 0 ? "↑" : "↓";
  const color = isNeutral ? "text-gray-400" : isGood ? "text-green-600" : "text-red-600";
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">{label}</div>
      <div className="text-xl font-extrabold mb-0.5">{value}</div>
      <div className={`text-[10px] font-bold ${color}`}>
        {symbol} {isNeutral ? "no change" : `${Math.abs(delta).toFixed(1)}%`} vs prev
      </div>
    </div>
  );
}
