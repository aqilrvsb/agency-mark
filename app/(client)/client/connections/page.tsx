import { createClient } from "@/lib/supabase/server";
import { requireClient } from "@/lib/auth/guards";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Plug, CheckCircle2, AlertCircle, Building2, ShieldAlert } from "lucide-react";
import { ConnectButton } from "./connect-button";
import { syncBrandConnections } from "@/lib/zernio/sync-connections";

export const dynamic = "force-dynamic";

export default async function ClientConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; platform?: string }>;
}) {
  const params = await searchParams;
  const user = await requireClient();
  const supabase = await createClient();

  // Find the brand assigned to this client
  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("assigned_client_user_id", user.id)
    .maybeSingle();

  // Reconcile Zernio's connections into our brand_ad_accounts. Best-effort —
  // page still renders if Zernio is down. This keeps the "Connected" badge
  // accurate without needing webhook plumbing.
  if (brand?.id) {
    try {
      await syncBrandConnections(brand.id as string);
    } catch (e) {
      console.error("[connections page] zernio sync failed:", e);
    }
  }

  // Pull both: the Page-level connections (brand_ad_accounts) and the
  // discovered Ad Accounts under each Page (brand_platform_ad_accounts).
  const [{ data: pageConnections }, { data: adAccounts }] = brand
    ? await Promise.all([
        supabase
          .from("brand_ad_accounts")
          .select("id, platform, external_account_id, external_account_name, is_active, created_at")
          .eq("brand_id", brand.id as string)
          .order("created_at", { ascending: false }),
        supabase
          .from("brand_platform_ad_accounts")
          .select("id, platform, social_account_id, platform_ad_account_id, ad_account_name, currency, status, timezone_name")
          .eq("brand_id", brand.id as string)
          .order("ad_account_name", { ascending: true }),
      ])
    : [{ data: [] }, { data: [] }];

  const connected = new Set((pageConnections ?? []).map((c) => {
    const p = c.platform as string;
    if (p === "meta" || p === "meta_ads") return "facebook";
    if (p === "meta_insights") return "facebook_insights";
    if (p === "google_ads") return "google";
    if (p === "tiktok" || p === "tiktok_ads") return "tiktok";
    return p;
  }));

  // Group discovered Ad Accounts by their parent SocialAccount (Page) ID
  const adAccountsByPage = new Map<string, typeof adAccounts>();
  for (const a of adAccounts ?? []) {
    const key = a.social_account_id as string;
    const list = adAccountsByPage.get(key) ?? [];
    list.push(a);
    adAccountsByPage.set(key, list);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Connect ad accounts</h1>
        <p className="text-[var(--color-text-secondary)]">
          Link your Facebook, Google, and TikTok ad accounts so {brand?.name ? `${brand.name as string}'s` : "your"} performance flows into this dashboard automatically.
        </p>
      </header>

      {params.ok === "1" && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="font-bold text-emerald-300 text-sm">Connected!</div>
            <div className="text-xs text-emerald-300/80">
              {params.platform ? `Your ${params.platform} account is linked. ` : ""}
              First data should appear within 1 hour.
            </div>
          </div>
        </div>
      )}
      {params.error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <div>
            <div className="font-bold text-red-300 text-sm">Connection failed</div>
            <div className="text-xs text-red-300/80">{params.error}</div>
          </div>
        </div>
      )}

      {!brand && (
        <Card className="!border-amber-500/30 !bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-amber-300">Brand not assigned yet</CardTitle>
            <CardDescription>Your agency hasn&apos;t linked your brand to this account. Reach out to them via the Support page.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Heads-up if FB is connected but no Ad Accounts were discovered —
          this is the "ads_read scope missing" symptom. */}
      {brand && connected.has("facebook") && (adAccountsByPage.size === 0) && (
        <Card className="mb-6 !border-amber-500/30 !bg-amber-500/5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-amber-300 mb-1">Ad permissions missing</div>
              <p className="text-sm text-amber-200/90 mb-3">
                Your Facebook Page is connected but we can&apos;t see your ad campaigns. This usually
                means the Meta consent screen didn&apos;t grant the &quot;Manage ads&quot; permission.
                Reconnect below — when Meta asks, tick <strong>both</strong> &quot;Manage your Pages&quot;
                AND &quot;Manage ads on your behalf&quot;.
              </p>
            </div>
          </div>
        </Card>
      )}

      {brand && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PlatformCard
            platform="facebook"
            label="Facebook Ads"
            description="Paid campaigns from Meta Ads Manager"
            color="from-blue-400 to-blue-600"
            connected={connected.has("facebook")}
          />
          <PlatformCard
            platform="google"
            label="Google Ads"
            description="Search, Display, YouTube campaigns"
            color="from-amber-400 to-amber-600"
            connected={connected.has("google")}
            comingSoon
          />
          <PlatformCard
            platform="tiktok"
            label="TikTok Ads"
            description="TikTok Ads Manager campaigns"
            color="from-pink-400 to-pink-600"
            connected={connected.has("tiktok")}
          />
        </div>
      )}

      {/* Connected: Page → Ad Accounts hierarchy */}
      {brand && (pageConnections ?? []).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plug className="w-5 h-5" /> Connected accounts</CardTitle>
            <CardDescription>
              {(pageConnections ?? []).length} active page connection{(pageConnections ?? []).length === 1 ? "" : "s"} ·
              {" "}{(adAccounts ?? []).length} ad account{(adAccounts ?? []).length === 1 ? "" : "s"} discovered
            </CardDescription>
          </CardHeader>

          <div className="divide-y divide-[var(--color-border)]">
            {(pageConnections ?? []).map((c) => {
              const p = c.platform as string;
              const label = p === "meta" || p === "meta_ads" ? "Facebook"
                : p === "meta_insights" ? "Facebook Page Insights"
                : p === "google_ads" ? "Google Ads"
                : p === "tiktok" || p === "tiktok_ads" ? "TikTok"
                : p;
              const pageId = c.external_account_id as string;
              const pageName = (c.external_account_name as string) || pageId;
              const linkedAdAccounts = adAccountsByPage.get(pageId) ?? [];

              return (
                <div key={c.id as string} className="py-4">
                  {/* Page row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-blue-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm flex items-center gap-2">
                          <span className="truncate">{pageName}</span>
                          <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold">{label} Page</span>
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] font-mono">{pageId}</div>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 font-bold uppercase">Active</span>
                  </div>

                  {/* Ad Accounts under this Page */}
                  {linkedAdAccounts.length > 0 ? (
                    <div className="ml-11 mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)]">
                      <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold border-b border-[var(--color-border)]">
                        {linkedAdAccounts.length} ad account{linkedAdAccounts.length === 1 ? "" : "s"} under this Page
                      </div>
                      <ul className="divide-y divide-[var(--color-border)]">
                        {linkedAdAccounts.map((a) => (
                          <li key={a.id as string} className="px-3 py-2.5 flex items-center justify-between text-sm">
                            <div className="min-w-0">
                              <div className="font-bold truncate">{(a.ad_account_name as string) || (a.platform_ad_account_id as string)}</div>
                              <div className="text-xs text-[var(--color-text-muted)] font-mono">
                                {a.platform_ad_account_id as string}
                                {a.currency ? ` · ${a.currency as string}` : ""}
                                {a.timezone_name ? ` · ${a.timezone_name as string}` : ""}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (p === "meta" || p === "meta_ads") ? (
                    <div className="ml-11 mt-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-200/90">
                      No ad accounts surfaced yet — reconnect with the &quot;Manage ads&quot; permission ticked on the Meta consent screen.
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function PlatformCard({
  platform,
  label,
  description,
  color,
  connected,
  comingSoon,
}: {
  platform: string;
  label: string;
  description: string;
  color: string;
  connected: boolean;
  comingSoon?: boolean;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
          <Plug className="w-6 h-6 text-black" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold">{label}</div>
          <div className="text-xs text-[var(--color-text-muted)]">{description}</div>
        </div>
        {connected && (
          <span className="text-xs px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 font-bold uppercase whitespace-nowrap">Connected</span>
        )}
        {comingSoon && !connected && (
          <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-[var(--color-text-muted)] font-bold uppercase whitespace-nowrap border border-[var(--color-border)]">Soon</span>
        )}
      </div>
      {comingSoon ? (
        <div className="px-4 py-2.5 rounded-xl text-xs text-[var(--color-text-muted)] bg-white/5 border border-[var(--color-border)] text-center leading-relaxed">
          Self-serve Google Ads OAuth coming soon.<br />
          <span className="text-[10px]">In the meantime, ask your agency to wire it via Marketing API.</span>
        </div>
      ) : (
        <ConnectButton platform={platform} connected={connected} />
      )}
    </Card>
  );
}
