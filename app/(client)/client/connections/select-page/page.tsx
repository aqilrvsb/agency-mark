import { requireClient } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getPeningads } from "@/lib/peningads/client";
import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageItem {
  id: string;
  name: string;
  category?: string;
  fan_count?: number;
  picture?: { data?: { url?: string } };
  username?: string;
}

interface SearchParams {
  tempToken?: string;
  userProfile?: string;     // URL-encoded JSON
  profileId?: string;
  connect_token?: string;   // not used server-side (we hit Peningads with our master key)
  platform?: string;
}

/**
 * Headless white-label Facebook Page picker. After Meta OAuth, the
 * provider redirects the browser here with tempToken + userProfile in
 * the query string. We:
 *   1. server-side fetch the user's manageable Pages from Peningads
 *   2. render a fully PeningAds-branded picker
 *   3. on submit, our /api/client/select-page completes the connection
 *
 * If the OAuth callback didn't include the expected tokens (user landed
 * here by mistake / refresh) we fall back to a friendly retry CTA.
 */
export default async function SelectFacebookPagePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await requireClient();
  const supabase = await createClient();
  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, peningads_profile_id")
    .eq("assigned_client_user_id", user.id)
    .maybeSingle();

  const tempToken = sp.tempToken;
  const userProfileRaw = sp.userProfile;
  const profileId = sp.profileId ?? (brand?.peningads_profile_id as string | undefined);

  if (!brand) return <Fallback message="No brand assigned to this account." />;
  if (!tempToken || !userProfileRaw || !profileId) {
    return <Fallback message="The connection flow didn't complete cleanly. Try again from the Connect Ads page." />;
  }

  // Parse the userProfile JSON Peningads forwards back to us.
  let userProfile: { id: string; username?: string; displayName?: string };
  try {
    userProfile = JSON.parse(decodeURIComponent(userProfileRaw));
  } catch {
    return <Fallback message="Could not read your Facebook profile data. Please reconnect." />;
  }

  let pages: PageItem[];
  try {
    const peningads = getPeningads();
    const res = await peningads.listFacebookPages({ profileId, tempToken });
    pages = res.pages;
  } catch (e) {
    return (
      <Fallback message={e instanceof Error ? e.message : "Could not load your Facebook pages."} />
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8 max-w-3xl mx-auto">
      <Link
        href="/client/connections"
        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-orange)] flex items-center gap-1 mb-5"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Connect Ads
      </Link>

      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)] mb-1">
          Step 2 of 2
        </p>
        <h1 className="font-display font-extrabold text-3xl mb-2">Choose your Facebook Page</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Pick the page that runs your ad campaigns. We&apos;ll use it to pull spend, results, and creative data into your reports.
        </p>
      </div>

      {pages.length === 0 ? (
        <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-6 text-center">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <h2 className="font-bold mb-1">No Facebook Pages found</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Your Facebook account doesn&apos;t have manage access to any page. Create a Page first or ask the page owner to add you as an admin, then reconnect.
          </p>
        </div>
      ) : (
        <form action="/api/client/select-page" method="POST" className="space-y-2">
          <input type="hidden" name="profileId" value={profileId} />
          <input type="hidden" name="tempToken" value={tempToken} />
          <input type="hidden" name="userProfileJson" value={JSON.stringify(userProfile)} />
          <input type="hidden" name="brandId" value={brand.id as string} />

          {pages.map((p) => {
            const pictureUrl = p.picture?.data?.url;
            return (
              <button
                key={p.id}
                type="submit"
                name="pageId"
                value={p.id}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] hover:border-[var(--color-orange)]/50 hover:bg-white/[0.04] transition text-left"
              >
                {pictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pictureUrl}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-lg object-cover bg-black/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-text-muted)] text-xs font-bold">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate">{p.name}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                    {p.category ?? "Page"}
                    {typeof p.fan_count === "number" && p.fan_count > 0 && (
                      <> · {p.fan_count.toLocaleString()} followers</>
                    )}
                    {p.username && <> · @{p.username}</>}
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
              </button>
            );
          })}
        </form>
      )}
    </div>
  );
}

function Fallback({ message }: { message: string }) {
  return (
    <div className="min-h-screen p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h1 className="font-bold text-lg mb-1">Connection didn&apos;t complete</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
          </div>
        </div>
        <Link
          href="/client/connections"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-orange)] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Connect Ads
        </Link>
      </div>
    </div>
  );
}
