import { createClient } from "@/lib/supabase/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { notFound } from "next/navigation";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Building2, Wallet, BarChart3, Users, StickyNote, Pin, Megaphone, Target, Plug } from "lucide-react";
import { AddAdAccountForm } from "./add-ad-account-form";
import { AssignClientForm } from "./assign-client-form";
import { TopupForm } from "./topup-form";
import { NotesSection } from "./notes-section";
import { GoalsSection } from "./goals-section";
import { ChartAnnotationsManager } from "@/components/client/chart-annotations-form";
import { ClientHubTabs, parseHubTab, type HubTab } from "@/components/agency/client-hub-tabs";
import { HeroKPIStrip } from "@/components/client/hero-kpi-strip";
import { DualAxisChart } from "@/components/client/dual-axis-chart";
import { TopCampaignsTable } from "@/components/client/top-campaigns-table";
import { aggregateAdData, summarize } from "@/lib/client-data/aggregate";

export const dynamic = "force-dynamic";

const fmtMyr = (n: number) =>
  `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtInt = (n: number) => n.toLocaleString();
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

function deltaPct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function isoMinusDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function ClientHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const activeTab = parseHubTab(sp.tab);
  const user = await requireAgencyStaff();
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("id", id)
    .eq("company_id", user.company_id)
    .maybeSingle();

  if (!brand) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const start30 = isoMinusDays(today, 30);
  const priorEnd = isoMinusDays(start30, 1);
  const priorStart = isoMinusDays(priorEnd, 30);

  // Always fetch baseline (used in header KPIs across every tab)
  const [{ data: currData }, { data: priorData }, { data: budget }] = await Promise.all([
    supabase
      .from("ad_data")
      .select("platform, date_start, data")
      .eq("brand_id", id)
      .gte("date_start", start30)
      .lte("date_start", today),
    supabase
      .from("ad_data")
      .select("platform, date_start, data")
      .eq("brand_id", id)
      .gte("date_start", priorStart)
      .lte("date_start", priorEnd),
    supabase.from("client_budgets").select("*").eq("brand_id", id).maybeSingle(),
  ]);

  const allRows = aggregateAdData(currData ?? [], "campaign");
  const totals = summarize(allRows);
  const priorRows = aggregateAdData(priorData ?? [], "campaign");
  const priorTotals = summarize(priorRows);

  const dailyMap = new Map<string, { spend: number; revenue: number }>();
  for (const r of currData ?? []) {
    const d = (r.data as Record<string, unknown>) ?? {};
    const date = r.date_start as string;
    const ex = dailyMap.get(date) ?? { spend: 0, revenue: 0 };
    ex.spend += Number(d.spend ?? d.cost ?? 0);
    ex.revenue += Number(d.purchase_value ?? d.conversion_value ?? d.revenue ?? 0);
    dailyMap.set(date, ex);
  }
  const daily = [...dailyMap.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));
  const priorDailyMap = new Map<string, { spend: number; revenue: number }>();
  for (const r of priorData ?? []) {
    const d = (r.data as Record<string, unknown>) ?? {};
    const date = r.date_start as string;
    const ex = priorDailyMap.get(date) ?? { spend: 0, revenue: 0 };
    ex.spend += Number(d.spend ?? d.cost ?? 0);
    ex.revenue += Number(d.purchase_value ?? d.conversion_value ?? d.revenue ?? 0);
    priorDailyMap.set(date, ex);
  }
  const priorDaily = [...priorDailyMap.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));
  const currRevenue = daily.reduce((s, d) => s + d.revenue, 0);
  const priorRevenue = priorDaily.reduce((s, d) => s + d.revenue, 0);

  const heroTiles = [
    { label: "Spend (30d)", value: fmtMyr(totals.spend), delta: deltaPct(totals.spend, priorTotals.spend), deltaPositiveIsGood: false, accent: "text-[var(--color-orange)]" },
    { label: "Revenue (30d)", value: fmtMyr(currRevenue), delta: deltaPct(currRevenue, priorRevenue), deltaPositiveIsGood: true, accent: "text-emerald-400" },
    { label: "ROAS", value: totals.roas > 0 ? `${totals.roas.toFixed(2)}×` : "—", delta: deltaPct(totals.roas, priorTotals.roas), deltaPositiveIsGood: true, accent: "text-[var(--color-amber)]" },
    { label: "Conversions", value: fmtInt(totals.conversions), delta: deltaPct(totals.conversions, priorTotals.conversions), deltaPositiveIsGood: true, accent: "text-[var(--color-lime)]" },
    { label: "CTR", value: fmtPct(totals.ctr), delta: deltaPct(totals.ctr, priorTotals.ctr), deltaPositiveIsGood: true, accent: "text-cyan-400" },
    { label: "CPA", value: totals.conversions > 0 ? fmtMyr(totals.cpa) : "—", delta: deltaPct(totals.cpa, priorTotals.cpa), deltaPositiveIsGood: false, accent: "text-rose-300" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-black" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-extrabold text-3xl lg:text-4xl truncate">{brand.name as string}</h1>
          <p className="text-[var(--color-text-secondary)] text-sm">
            {(brand.contact_email as string) || "No contact email"} · {(brand.contact_phone as string) || "No phone"}
          </p>
        </div>
      </header>

      <ClientHubTabs brandId={id} active={activeTab} />

      {/* Hero strip stays visible on every tab */}
      <HeroKPIStrip tiles={heroTiles} />

      {/* Tab content */}
      <TabContent
        activeTab={activeTab}
        brandId={id}
        daily={daily}
        priorDaily={priorDaily}
        rows={allRows}
        budget={budget}
        supabase={supabase}
        last30Iso={start30}
        today={today}
        brand={brand}
      />
    </div>
  );
}

async function TabContent({
  activeTab,
  brandId,
  daily,
  priorDaily,
  rows,
  budget,
  supabase,
  last30Iso,
  today,
  brand,
}: {
  activeTab: HubTab;
  brandId: string;
  daily: { date: string; spend: number; revenue: number }[];
  priorDaily: { date: string; spend: number; revenue: number }[];
  rows: ReturnType<typeof aggregateAdData>;
  budget: { current_balance_myr?: number; total_topup_myr?: number; total_spent_myr?: number } | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
  last30Iso: string;
  today: string;
  brand: { id: unknown; name: unknown; assigned_client_user_id: unknown };
}) {
  // Each tab fetches only its own data
  if (activeTab === "dashboard") {
    return (
      <>
        <DualAxisChart current={daily} prior={priorDaily} />
        <TopCampaignsTable rows={rows.slice(0, 10)} />
      </>
    );
  }

  if (activeTab === "campaigns") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5" /> All campaigns</CardTitle>
          <CardDescription>Last 30 days, ranked by spend.</CardDescription>
        </CardHeader>
        <TopCampaignsTable rows={rows} />
      </Card>
    );
  }

  if (activeTab === "notes") {
    const { data: rawNotes } = await supabase
      .from("brand_notes")
      .select("id, body, created_at, author_id")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false })
      .limit(50);
    const noteAuthorIds = [...new Set((rawNotes ?? []).map((n) => n.author_id).filter(Boolean) as string[])];
    const { data: noteAuthors } = noteAuthorIds.length
      ? await supabase.from("users").select("id, full_name").in("id", noteAuthorIds)
      : { data: [] };
    const authorMap = new Map((noteAuthors ?? []).map((u) => [u.id as string, u.full_name as string]));
    const notes = (rawNotes ?? []).map((n) => ({
      id: n.id as string,
      body: n.body as string,
      created_at: n.created_at as string,
      author_name: n.author_id ? (authorMap.get(n.author_id as string) ?? null) : null,
    }));
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><StickyNote className="w-5 h-5" /> Internal notes</CardTitle>
          <CardDescription>Internal team conversation. Clients don&apos;t see these.</CardDescription>
        </CardHeader>
        <NotesSection brandId={brandId} initialNotes={notes} />
      </Card>
    );
  }

  if (activeTab === "annotations") {
    const { data: rawAnnotations } = await supabase
      .from("chart_annotations")
      .select("id, anchor_date, body, created_at, users(full_name)")
      .eq("brand_id", brandId)
      .gte("anchor_date", last30Iso)
      .lte("anchor_date", today)
      .order("anchor_date", { ascending: true });
    const annotations = (rawAnnotations ?? []).map((a) => {
      const u = (a as { users?: { full_name?: string } | null }).users;
      return {
        id: a.id as string,
        anchor_date: a.anchor_date as string,
        body: a.body as string,
        created_at: a.created_at as string,
        author_name: u?.full_name ?? null,
      };
    });
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Pin className="w-5 h-5" /> Chart annotations</CardTitle>
          <CardDescription>Pin a date with a short note — it appears on the client&apos;s performance chart.</CardDescription>
        </CardHeader>
        <ChartAnnotationsManager
          brandId={brandId}
          rangeStart={last30Iso}
          rangeEnd={today}
          annotations={annotations}
          canEdit={true}
        />
      </Card>
    );
  }

  if (activeTab === "goals") {
    const { data: targets } = await supabase
      .from("kpi_targets")
      .select("id, metric, target_value, direction")
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .order("metric");
    const initialTargets = (targets ?? []).map((t) => ({
      id: t.id as string,
      metric: t.metric as string,
      target_value: Number(t.target_value),
      direction: (t.direction as string) ?? "higher_is_better",
    }));
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5" /> Monthly goals</CardTitle>
          <CardDescription>Targets the client agreed to. Pacing shows on their dashboard.</CardDescription>
        </CardHeader>
        <GoalsSection brandId={brandId} initialTargets={initialTargets} />
      </Card>
    );
  }

  if (activeTab === "connections") {
    const { data: adAccounts } = await supabase.from("brand_ad_accounts").select("*").eq("brand_id", brandId);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plug className="w-5 h-5" /> Connected ad accounts</CardTitle>
          <CardDescription>Add the external ID after the client connects via Zernio.</CardDescription>
        </CardHeader>
        <div className="space-y-2">
          {(adAccounts ?? []).map((a) => {
            const platformLabel =
              a.platform === "meta_ads" || a.platform === "meta" ? "FB Ads"
              : a.platform === "meta_insights" ? "FB Insights"
              : a.platform === "google_ads" ? "Google Ads"
              : a.platform === "tiktok_ads" || a.platform === "tiktok" ? "TikTok"
              : (a.platform as string);
            const platformColor =
              a.platform === "meta_ads" || a.platform === "meta" ? "bg-blue-500/15 text-blue-300"
              : a.platform === "meta_insights" ? "bg-cyan-500/15 text-cyan-300"
              : a.platform === "google_ads" ? "bg-amber-500/15 text-amber-300"
              : "bg-pink-500/15 text-pink-300";
            return (
              <div key={a.id as string} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-bg-soft)]">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${platformColor}`}>{platformLabel}</span>
                  <code className="text-xs">{a.external_account_id as string}</code>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {(a.external_account_name as string) || "—"}
                </span>
              </div>
            );
          })}
          {(adAccounts ?? []).length === 0 && (
            <div className="text-sm text-[var(--color-text-muted)] py-4 text-center">
              No ad accounts connected yet.
            </div>
          )}
          <div className="pt-2">
            <AddAdAccountForm brandId={brandId} />
          </div>
        </div>
      </Card>
    );
  }

  if (activeTab === "users") {
    const { data: clientUser } = brand.assigned_client_user_id
      ? await supabase.from("users").select("email, full_name").eq("id", brand.assigned_client_user_id as string).maybeSingle()
      : { data: null };
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Client portal user</CardTitle>
          <CardDescription>Give the client a login to view their own dashboard.</CardDescription>
        </CardHeader>
        <AssignClientForm brandId={brandId} currentClientEmail={(clientUser as { email?: string } | null)?.email ?? null} />
      </Card>
    );
  }

  if (activeTab === "budget") {
    const { data: topups } = await supabase
      .from("budget_topups")
      .select("amount_myr, payment_method, status, created_at")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false })
      .limit(10);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Budget</CardTitle>
          <CardDescription>
            Balance: RM {Number(budget?.current_balance_myr ?? 0).toLocaleString()} ·
            Total topped up: RM {Number(budget?.total_topup_myr ?? 0).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <div className="space-y-3">
          <TopupForm brandId={brandId} />
          {(topups ?? []).length > 0 && (
            <div className="pt-2 border-t border-[var(--color-border)] space-y-1">
              <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-2">Recent top-ups</div>
              {(topups ?? []).map((t, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5">
                  <span className="text-[var(--color-text-muted)]">
                    {new Date(t.created_at as string).toLocaleDateString()}
                  </span>
                  <span className="text-[var(--color-text-muted)]">{(t.payment_method as string) || "—"}</span>
                  <span className="font-mono">RM {Number(t.amount_myr).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    );
  }

  return null;
}
