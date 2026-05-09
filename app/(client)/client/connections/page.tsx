import { createClient } from "@/lib/supabase/server";
import { requireClient } from "@/lib/auth/guards";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Plug, CheckCircle2, AlertCircle } from "lucide-react";
import { ConnectButton } from "./connect-button";

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

  const { data: connections } = brand
    ? await supabase
        .from("brand_ad_accounts")
        .select("id, platform, external_account_id, external_account_name, is_active, created_at")
        .eq("brand_id", brand.id as string)
        .order("created_at", { ascending: false })
    : { data: [] };

  const connected = new Set((connections ?? []).map((c) => {
    const p = c.platform as string;
    if (p === "meta" || p === "meta_ads") return "facebook";
    if (p === "meta_insights") return "facebook_insights";
    if (p === "google_ads") return "google";
    if (p === "tiktok" || p === "tiktok_ads") return "tiktok";
    return p;
  }));

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
            agencyManaged
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

      {brand && (connections ?? []).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plug className="w-5 h-5" /> Connected accounts</CardTitle>
            <CardDescription>{(connections ?? []).length} active connection{(connections ?? []).length === 1 ? "" : "s"}</CardDescription>
          </CardHeader>
          <div className="divide-y divide-[var(--color-border)]">
            {(connections ?? []).map((c) => {
              const p = c.platform as string;
              const label = p === "meta" || p === "meta_ads" ? "Facebook Ads"
                : p === "meta_insights" ? "Facebook Page Insights"
                : p === "google_ads" ? "Google Ads"
                : p === "tiktok" || p === "tiktok_ads" ? "TikTok Ads"
                : p;
              return (
                <div key={c.id as string} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm">{label}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {(c.external_account_name as string) || (c.external_account_id as string)}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 font-bold uppercase">Active</span>
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
  agencyManaged,
}: {
  platform: string;
  label: string;
  description: string;
  color: string;
  connected: boolean;
  agencyManaged?: boolean;
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
      </div>
      {agencyManaged ? (
        <a
          href="/client/support"
          className="block text-center w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition border border-[var(--color-border)]"
        >
          {connected ? "Managed by your agency" : "Contact agency to set up"}
        </a>
      ) : (
        <ConnectButton platform={platform} connected={connected} />
      )}
    </Card>
  );
}
