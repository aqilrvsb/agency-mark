import { createClient } from "@/lib/supabase/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { notFound } from "next/navigation";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Building2, Wallet, BarChart3, Users, StickyNote, Pin } from "lucide-react";
import { AddAdAccountForm } from "./add-ad-account-form";
import { AssignClientForm } from "./assign-client-form";
import { TopupForm } from "./topup-form";
import { NotesSection } from "./notes-section";
import { ChartAnnotationsManager } from "@/components/client/chart-annotations-form";

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

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: adAccounts }, { data: adData }, { data: budget }, { data: topups }, { data: clientUser }, { data: rawNotes }, { data: rawAnnotations }] = await Promise.all([
    supabase.from("brand_ad_accounts").select("*").eq("brand_id", id),
    supabase.from("ad_data").select("platform, date_start, data").eq("brand_id", id).gte("date_start", last30Iso).order("date_start", { ascending: false }),
    supabase.from("client_budgets").select("*").eq("brand_id", id).maybeSingle(),
    supabase.from("budget_topups").select("amount_myr, payment_method, status, created_at").eq("brand_id", id).order("created_at", { ascending: false }).limit(5),
    brand.assigned_client_user_id
      ? supabase.from("users").select("email, full_name").eq("id", brand.assigned_client_user_id as string).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("brand_notes").select("id, body, created_at, author_id").eq("brand_id", id).order("created_at", { ascending: false }).limit(20),
    supabase
      .from("chart_annotations")
      .select("id, anchor_date, body, created_at, users(full_name)")
      .eq("brand_id", id)
      .gte("anchor_date", last30Iso)
      .lte("anchor_date", today)
      .order("anchor_date", { ascending: true }),
  ]);
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
            <CardDescription>Connect FB Ads, FB Page Insights, and TikTok Ads via Zernio.</CardDescription>
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
              <AddAdAccountForm brandId={id} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Recent ad data</CardTitle>
            <CardDescription>Daily snapshots synced from Zernio.</CardDescription>
          </CardHeader>
          <div className="space-y-1.5">
            {(adData ?? []).slice(0, 8).map((row, i) => {
              const d = row.data as Record<string, unknown>;
              const platformShort = (row.platform as string)?.startsWith("meta") ? "FB" : "TT";
              const platformColor = (row.platform as string)?.startsWith("meta") ? "bg-blue-500/15 text-blue-300" : "bg-pink-500/15 text-pink-300";
              return (
                <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-[var(--color-border)] last:border-0">
                  <span className="text-[var(--color-text-muted)]">{row.date_start as string}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${platformColor}`}>
                    {platformShort}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Client portal user</CardTitle>
            <CardDescription>Give the client a login to view their own dashboard.</CardDescription>
          </CardHeader>
          <AssignClientForm brandId={id} currentClientEmail={(clientUser as { email?: string } | null)?.email ?? null} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Budget</CardTitle>
            <CardDescription>
              Balance: RM {Number(budget?.current_balance_myr ?? 0).toLocaleString()} ·
              Total topped up: RM {Number(budget?.total_topup_myr ?? 0).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <div className="space-y-3">
            <TopupForm brandId={id} />
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
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><StickyNote className="w-5 h-5" /> Notes &amp; activity</CardTitle>
            <CardDescription>Internal notes for the team. Clients don&apos;t see this.</CardDescription>
          </CardHeader>
          <NotesSection brandId={id} initialNotes={notes} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Pin className="w-5 h-5" /> Chart annotations</CardTitle>
            <CardDescription>Pin a date with a short note — it appears as a marker on the client&apos;s performance chart.</CardDescription>
          </CardHeader>
          <ChartAnnotationsManager
            brandId={id}
            rangeStart={last30Iso}
            rangeEnd={today}
            annotations={annotations}
            canEdit={true}
          />
        </Card>
      </div>
    </div>
  );
}
