import { createClient } from "@/lib/supabase/server";
import { requireClient } from "@/lib/auth/guards";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, ShieldAlert, Sparkles } from "lucide-react";
import { ConnectButton } from "./connect-button";
import { syncBrandConnections } from "@/lib/peningads/sync-connections";
import {
  PLATFORM_BRANDS,
  FacebookGlyph,
  GoogleGlyph,
  TikTokGlyph,
  type PlatformBrand,
} from "./platform-glyphs";

/** Human-readable "X min ago" / "just now" / "X hours ago". */
function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 45) return "just now";
  if (s < 90) return "1 min ago";
  const m = Math.round(s / 60);
  if (m < 45) return `${m} min ago`;
  if (m < 90) return "1 hr ago";
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** Resolve the right glyph + brand-tile colours for a stored platform code. */
function platformVisual(p: string): {
  Glyph: React.ComponentType<{ className?: string }>;
  bg: string;
  isLight: boolean;
  label: string;
} {
  if (p === "meta" || p === "meta_ads" || p === "facebook") {
    return { Glyph: FacebookGlyph, bg: "#1877F2", isLight: false, label: "Facebook" };
  }
  if (p === "google_ads" || p === "google") {
    return { Glyph: GoogleGlyph, bg: "#ffffff", isLight: true, label: "Google Ads" };
  }
  if (p === "tiktok" || p === "tiktok_ads") {
    return { Glyph: TikTokGlyph, bg: "#000000", isLight: false, label: "TikTok" };
  }
  return { Glyph: FacebookGlyph, bg: "#1877F2", isLight: false, label: p };
}

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

  // Reconcile Peningads' connections into our brand_ad_accounts. Best-effort —
  // page still renders if Peningads is down. This keeps the "Connected" badge
  // accurate without needing webhook plumbing.
  if (brand?.id) {
    try {
      await syncBrandConnections(brand.id as string);
    } catch (e) {
      console.error("[connections page] peningads sync failed:", e);
    }
  }

  // Pull: Page-level connections (brand_ad_accounts), the discovered Ad
  // Accounts under each Page (brand_platform_ad_accounts), and the latest
  // sync log so we can show "Synced 12 min ago" per Page.
  const [{ data: pageConnections }, { data: adAccounts }, { data: syncLogs }] = brand
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
        supabase
          .from("adzviser_sync_logs")
          .select("platform, status, synced_at")
          .eq("brand_id", brand.id as string)
          .order("synced_at", { ascending: false })
          .limit(20),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  // Map each platform code to its most recent successful sync timestamp
  const lastSyncByPlatform = new Map<string, string>();
  for (const log of (syncLogs ?? []) as Array<{ platform: string; status: string; synced_at: string }>) {
    if (!lastSyncByPlatform.has(log.platform)) {
      lastSyncByPlatform.set(log.platform, log.synced_at);
    }
  }

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-8 relative">
        {/* Hairline magenta accent above the title — anchors the page to
            the brand without crowding the headline. */}
        <div
          aria-hidden
          className="h-px w-12 mb-4 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, var(--gradient-brand-via), var(--gradient-brand-to))",
          }}
        />
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)] mb-2">
          <Sparkles className="w-3 h-3" style={{ color: "var(--color-orange)" }} />
          Step 1 · Connect
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl mb-2 leading-[1.05]">
          Connect ad accounts
        </h1>
        <p className="text-[var(--color-text-secondary)] max-w-2xl">
          Link your Facebook, Google, and TikTok ad accounts so{" "}
          {brand?.name ? (
            <span className="font-bold text-[var(--color-text-primary)]">
              {brand.name as string}
            </span>
          ) : (
            "your"
          )}
          ’s performance flows into this dashboard automatically.
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
          {PLATFORM_BRANDS.map((b) => (
            <PlatformCard
              key={b.slug}
              brand={b}
              connected={connected.has(b.slug)}
            />
          ))}
        </div>
      )}

      {/* Connected: Page → Ad Accounts hierarchy.
          Mirrors the platform-tile design system: brand glyph tile,
          live sync indicator, vertical accent line connecting parent
          Page to its discovered ad accounts. */}
      {brand && (pageConnections ?? []).length > 0 && (
        <section className="mt-8">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)] mb-3">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            Step 2 · Live · {(pageConnections ?? []).length} page{(pageConnections ?? []).length === 1 ? "" : "s"} · {(adAccounts ?? []).length} ad account{(adAccounts ?? []).length === 1 ? "" : "s"}
          </div>
          <h2 className="font-display font-extrabold text-xl mb-4">Connected accounts</h2>

          <div className="space-y-3">
            {(pageConnections ?? []).map((c) => {
              const p = c.platform as string;
              const v = platformVisual(p);
              const Glyph = v.Glyph;
              const pageId = c.external_account_id as string;
              const pageName = (c.external_account_name as string) || pageId;
              const linkedAdAccounts = adAccountsByPage.get(pageId) ?? [];
              const lastSync =
                lastSyncByPlatform.get(p) ??
                lastSyncByPlatform.get(
                  p === "meta_ads" ? "meta" : p === "meta" ? "meta_ads" : p
                );

              return (
                <div
                  key={c.id as string}
                  className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] overflow-hidden transition-colors hover:border-[var(--color-border-bright)]"
                >
                  {/* Page row */}
                  <div className="px-4 sm:px-5 py-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          v.isLight ? "border border-[var(--color-border-bright)]" : ""
                        }`}
                        style={{
                          background: v.bg,
                          boxShadow: v.isLight
                            ? "0 4px 12px -4px rgba(0,0,0,0.4)"
                            : `0 6px 16px -6px ${v.bg}80`,
                        }}
                      >
                        <Glyph className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="font-bold text-sm truncate max-w-[260px]" title={pageName}>
                            {pageName}
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-muted)] font-bold">
                            {v.label} Page
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--color-text-muted)] font-mono truncate">
                          {pageId}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 font-bold uppercase tracking-[0.08em] border border-emerald-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                        Synced {timeAgo(lastSync)}
                      </span>
                    </div>
                  </div>

                  {/* Ad Accounts under this Page — visually connected by a
                      left-side gradient bar matching the platform colour */}
                  {linkedAdAccounts.length > 0 ? (
                    <div className="relative pl-[27px] sm:pl-[31px] pr-4 sm:pr-5 pb-4">
                      <div
                        aria-hidden
                        className="absolute left-[27px] sm:left-[31px] top-0 bottom-4 w-px"
                        style={{
                          background: v.isLight
                            ? "linear-gradient(180deg, var(--color-border-bright), transparent)"
                            : `linear-gradient(180deg, ${v.bg}80, transparent)`,
                        }}
                      />
                      <div className="ml-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] overflow-hidden">
                        <div className="px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-muted)] font-bold border-b border-[var(--color-border)] flex items-center justify-between">
                          <span>{linkedAdAccounts.length} ad account{linkedAdAccounts.length === 1 ? "" : "s"} under this Page</span>
                          <span className="text-[10px] font-mono normal-case tracking-normal">
                            {linkedAdAccounts
                              .map((a) => a.currency as string)
                              .filter(Boolean)
                              .filter((v, i, arr) => arr.indexOf(v) === i)
                              .join(" · ") || ""}
                          </span>
                        </div>
                        <ul className="divide-y divide-[var(--color-border)]">
                          {linkedAdAccounts.map((a) => (
                            <li
                              key={a.id as string}
                              className="px-3 py-2.5 flex items-center justify-between gap-3 text-sm"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-bold truncate">
                                  {(a.ad_account_name as string) || (a.platform_ad_account_id as string)}
                                </div>
                                <div className="text-[11px] text-[var(--color-text-muted)] font-mono truncate">
                                  {a.platform_ad_account_id as string}
                                  {a.timezone_name ? ` · ${a.timezone_name as string}` : ""}
                                </div>
                              </div>
                              {a.currency && (
                                <span className="text-[10px] font-mono font-bold text-[var(--color-text-secondary)] px-1.5 py-0.5 rounded bg-white/5 flex-shrink-0">
                                  {a.currency as string}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (p === "meta" || p === "meta_ads") ? (
                    <div className="mx-4 sm:mx-5 mb-4 px-3 py-2.5 rounded-xl border border-[var(--color-orange)]/25 bg-[var(--color-orange-tint)] text-xs text-[var(--color-orange-300)]">
                      No ad accounts surfaced yet — reconnect with the “Manage ads” permission ticked on the Meta consent screen.
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function PlatformCard({
  brand,
  connected,
}: {
  brand: PlatformBrand;
  connected: boolean;
}) {
  const Glyph = brand.Glyph;
  // Google's icon tile is white-on-white; needs a subtle border + minimal
  // shadow so the four-colour glyph reads. The other two have coloured
  // backgrounds, so we lean on a coloured drop-shadow for depth.
  const isLight = brand.slug === "google";

  return (
    <div className="relative rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-5 sm:p-6 overflow-hidden transition-all hover:border-[var(--color-border-bright)]">
      {/* Soft brand-coloured glow bleeding from the top-left corner —
          gives each tile its own colour story without overpowering the
          dark canvas. Disabled for Google (white) so it doesn't wash out. */}
      {!isLight && (
        <div
          aria-hidden
          className="absolute -top-16 -left-16 w-40 h-40 rounded-full blur-3xl pointer-events-none"
          style={{ background: `rgba(${brand.brandRgb}, 0.18)` }}
        />
      )}

      <div className="relative flex items-start gap-3 mb-5">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            isLight ? "border border-[var(--color-border-bright)]" : ""
          }`}
          style={{
            background: brand.brandHex,
            boxShadow: isLight
              ? "0 4px 14px -4px rgba(0,0,0,0.4)"
              : `0 8px 22px -6px rgba(${brand.brandRgb}, 0.55)`,
          }}
        >
          <Glyph className="w-7 h-7" />
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="font-bold text-base leading-tight">{brand.label}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">
            {brand.description}
          </div>
        </div>

        {connected && (
          <span className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 font-bold uppercase whitespace-nowrap tracking-[0.08em] border border-emerald-500/25">
            Connected
          </span>
        )}
      </div>

      <ConnectButton platform={brand.slug} connected={connected} />
    </div>
  );
}
