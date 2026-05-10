// Zernio REST API client.
// Docs: https://docs.zernio.com — auth via Bearer token from ZERNIO_API_KEY.
//
// Data model (the truth, confirmed by openapi.yaml + live probes):
//
//     SocialAccount (Page / Profile)        ← /v1/accounts
//        │
//        │ /v1/ads/accounts?accountId=X
//        ▼
//     PlatformAdAccount (act_123 / advertiser_id / customer_id)
//        │
//        │ /v1/ads?adAccountId=Y&fromDate=...&toDate=...&platform=...
//        ▼
//     Ad (with summary metrics over the window)
//        │
//        │ /v1/ads/{adId}/analytics?fromDate=...&toDate=...
//        ▼
//     Per-day timeseries
//
// Platform string for ads endpoints:
//   facebook | instagram | tiktok | linkedin | pinterest | google | twitter
//
// Note: /v1/connect/{platform} only supports
//   facebook | instagram | tiktok | linkedin | twitter | pinterest | youtube
// Google Ads is NOT in the connect list — must be set up out-of-band.

export type ZernioPlatform = "facebook" | "instagram" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "youtube";
export type ZernioAdsPlatform = "facebook" | "instagram" | "tiktok" | "linkedin" | "pinterest" | "google" | "twitter";

export interface ZernioSocialAccount {
  _id: string;
  platform: ZernioPlatform;
  username?: string;
  displayName?: string;
  isActive?: boolean;
  enabled?: boolean;
  platformStatus?: string;
  adsStatus?: string;
  profileId?: { _id: string; name?: string } | string;
  metadata?: {
    selectedPageId?: string;
    selectedPageName?: string;
    [k: string]: unknown;
  };
  createdAt?: string;
}

export interface ZernioPlatformAdAccount {
  id: string; // act_123 / advertiser_id / customer_id
  name: string;
  currency?: string;
  status?: string;
  accountStatus?: number;
  businessName?: string;
  timezoneName?: string;
  timezoneOffsetHoursUtc?: number;
}

/**
 * Metrics returned per Ad over a date range. Field names follow Zernio's
 * AdMetrics schema; not every field is set on every platform / response.
 * Always treat numeric fields as `number | undefined`.
 */
export interface ZernioAdMetrics {
  spend?: number;
  impressions?: number;
  reach?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  cpa?: number;
  conversions?: number;
  conversion_value?: number;
  purchase_value?: number;
  roas?: number;
  video_views?: number;
  video_views_25?: number;
  video_views_50?: number;
  video_views_75?: number;
  video_views_100?: number;
  [k: string]: unknown;
}

export interface ZernioAd {
  _id: string; // Zernio internal ID (Mongo ObjectId) — actual field name on the wire
  id?: string; // Some endpoints alias as `id`; treat as optional
  platformAdId?: string;
  name?: string;
  platform: ZernioAdsPlatform;
  adAccountId?: string;
  campaignId?: string;
  adSetId?: string;
  campaignName?: string;
  adSetName?: string;
  status?: string;
  effectiveStatus?: string;
  isExternal?: boolean;
  metrics?: ZernioAdMetrics;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: unknown;
}

export interface ZernioAdCampaign {
  id?: string;
  platformCampaignId: string;
  name?: string;
  platform: ZernioAdsPlatform;
  adAccountId?: string;
  status?: string;
  metrics?: ZernioAdMetrics;
  adCount?: number;
  [k: string]: unknown;
}

export interface ZernioAdAnalyticsResponse {
  ad: { id: string; name?: string; platform: string; status?: string };
  analytics: {
    summary: ZernioAdMetrics;
    daily: Array<ZernioAdMetrics & { date: string }>;
    breakdowns?: Record<string, unknown[]>;
  };
}

export interface ZernioPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export class ZernioClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.ZERNIO_API_KEY ?? "";
    if (!this.apiKey) throw new Error("ZERNIO_API_KEY env var is not set");
    // Zernio's REST API lives at zernio.com/api/v1. We saw 405s when the env
    // var was accidentally set to https://api.zernio.com (no /api/v1), so
    // normalize known-bad values to the canonical host.
    const raw = baseUrl ?? process.env.ZERNIO_API_BASE_URL ?? "https://zernio.com/api/v1";
    const normalized = raw.replace(/\/$/, "");
    this.baseUrl =
      normalized === "https://api.zernio.com" || normalized === "https://zernio.com"
        ? "https://zernio.com/api/v1"
        : normalized;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Zernio ${path} ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  // ─────────────────────────────────────────────────────────
  // Social accounts (Pages / Profiles)
  // ─────────────────────────────────────────────────────────

  async listSocialAccounts(opts?: { profileId?: string }): Promise<ZernioSocialAccount[]> {
    const qs = opts?.profileId ? `?profileId=${encodeURIComponent(opts.profileId)}` : "";
    const res = await this.request<{ accounts: ZernioSocialAccount[] } | ZernioSocialAccount[]>(`/accounts${qs}`);
    return Array.isArray(res) ? res : res.accounts;
  }

  /** Back-compat alias used by sync-connections.ts */
  async listAccounts(opts?: { profileId?: string }): Promise<ZernioSocialAccount[]> {
    return this.listSocialAccounts(opts);
  }

  async getSocialAccount(accountId: string): Promise<ZernioSocialAccount> {
    return this.request<ZernioSocialAccount>(`/accounts/${accountId}`);
  }

  // ─────────────────────────────────────────────────────────
  // Platform Ad Accounts (the act_123 layer)
  // ─────────────────────────────────────────────────────────

  /**
   * GET /v1/ads/accounts?accountId=<socialAccountId>
   * Returns the platform Ad Accounts available for the given Social Account
   * (e.g. Meta ad accounts act_123 / TikTok advertiser IDs / Google Ads
   * customer IDs). Cached 1h server-side by Zernio.
   */
  async listAdAccounts(socialAccountId: string): Promise<ZernioPlatformAdAccount[]> {
    const res = await this.request<{ accounts: ZernioPlatformAdAccount[] }>(
      `/ads/accounts?accountId=${encodeURIComponent(socialAccountId)}`
    );
    return res.accounts ?? [];
  }

  // ─────────────────────────────────────────────────────────
  // Ads + campaigns (with metrics over a date range)
  // ─────────────────────────────────────────────────────────

  /**
   * GET /v1/ads — paginated list of ads with summary metrics over the
   * supplied date range. source=all (default) includes externally-discovered
   * ads from the platform's ad manager.
   */
  async listAds(opts: {
    adAccountId: string;
    platform: ZernioAdsPlatform;
    fromDate: string; // YYYY-MM-DD
    toDate: string;   // YYYY-MM-DD
    campaignId?: string;
    status?: string;
    limit?: number;
    page?: number;
    source?: "all" | "zernio";
  }): Promise<{ ads: ZernioAd[]; pagination: ZernioPagination }> {
    const qs = new URLSearchParams({
      adAccountId: opts.adAccountId,
      platform: opts.platform,
      fromDate: opts.fromDate,
      toDate: opts.toDate,
      limit: String(opts.limit ?? 100),
      page: String(opts.page ?? 1),
      source: opts.source ?? "all",
    });
    if (opts.campaignId) qs.set("campaignId", opts.campaignId);
    if (opts.status) qs.set("status", opts.status);
    return this.request<{ ads: ZernioAd[]; pagination: ZernioPagination }>(`/ads?${qs.toString()}`);
  }

  /**
   * GET /v1/ads/campaigns — paginated list of campaigns with aggregate
   * metrics (summed across child ads). NOTE: per OpenAPI, this endpoint
   * does not officially accept fromDate/toDate; aggregate metrics are
   * computed over each underlying ad's stored window.
   */
  async listAdCampaigns(opts: {
    adAccountId: string;
    platform: ZernioAdsPlatform;
    status?: string;
    limit?: number;
    page?: number;
    source?: "all" | "zernio";
  }): Promise<{ campaigns: ZernioAdCampaign[]; pagination: ZernioPagination }> {
    const qs = new URLSearchParams({
      adAccountId: opts.adAccountId,
      platform: opts.platform,
      limit: String(opts.limit ?? 50),
      page: String(opts.page ?? 1),
      source: opts.source ?? "all",
    });
    if (opts.status) qs.set("status", opts.status);
    return this.request<{ campaigns: ZernioAdCampaign[]; pagination: ZernioPagination }>(
      `/ads/campaigns?${qs.toString()}`
    );
  }

  /**
   * GET /v1/ads/{adId}/analytics — per-ad detailed analytics for the date
   * range. Returns summary + daily timeseries (the array we feed into
   * the per-day chart cache).
   */
  async getAdAnalytics(adId: string, opts: {
    fromDate: string;
    toDate: string;
    breakdowns?: string[];
  }): Promise<ZernioAdAnalyticsResponse> {
    const qs = new URLSearchParams({
      fromDate: opts.fromDate,
      toDate: opts.toDate,
    });
    if (opts.breakdowns && opts.breakdowns.length > 0) {
      qs.set("breakdowns", opts.breakdowns.join(","));
    }
    return this.request<ZernioAdAnalyticsResponse>(`/ads/${encodeURIComponent(adId)}/analytics?${qs.toString()}`);
  }

  // ─────────────────────────────────────────────────────────
  // Connect / Profile management (existing flows)
  // ─────────────────────────────────────────────────────────

  /**
   * Build an OAuth URL the user is redirected to in order to connect a new
   * social account. Zernio expects:
   *   GET /connect/{platform}?profileId={profileId}&redirect_url={url}
   *
   * NOTE: this endpoint connects the POSTING / organic side (Page, Profile).
   * It does NOT grant ads access. For ad data, call getAdsConnectUrl below.
   */
  async getConnectUrl(params: {
    platform: ZernioPlatform;
    profileId: string;
    redirectUrl?: string;
  }): Promise<{ authUrl: string }> {
    const qs = new URLSearchParams({ profileId: params.profileId });
    if (params.redirectUrl) {
      qs.set("redirect_url", params.redirectUrl);
      qs.set("redirectUrl", params.redirectUrl); // belt-and-braces; Zernio has accepted both
    }
    return this.request<{ authUrl: string }>(`/connect/${params.platform}?${qs.toString()}`);
  }

  /**
   * Connect ADS for a platform — the actual endpoint that grants ad-data access.
   *   GET /v1/connect/{platform}/ads
   *
   * Per Zernio's spec:
   *  - Same-token platforms (facebook, instagram, linkedin, pinterest) copy the
   *    OAuth token from the existing organic SocialAccount and create an ads
   *    SocialAccount with values metaads / linkedinads / pinterestads. If the
   *    parent token already has ads scope, the response is { alreadyConnected,
   *    accountId } with no OAuth round-trip.
   *  - Separate-token platforms (tiktok, twitter) return an authUrl pointing at
   *    that platform's marketing-API OAuth, which on completion creates a
   *    tiktokads / xads SocialAccount.
   *  - Standalone platforms (googleads) return an authUrl pointing at Google's
   *    Ads OAuth and create a googleads SocialAccount.
   *
   * Optional adAccountId / adAccountIds (Meta only) scope the resulting sync
   * to a single (or set of) Meta Ad Accounts (act_*).
   */
  async getAdsConnectUrl(params: {
    platform: "facebook" | "instagram" | "linkedin" | "tiktok" | "twitter" | "pinterest" | "googleads";
    profileId: string;
    accountId?: string;            // existing parent SocialAccount ID (req for twitter, optional for tiktok)
    redirectUrl?: string;
    adAccountId?: string;          // metaads only (e.g. act_1234567890)
    adAccountIds?: string[];       // metaads only — multiple
  }): Promise<
    | { alreadyConnected: true; accountId: string; platform: string; username?: string; displayName?: string; scopedAdAccountIds?: string[] }
    | { authUrl: string; state?: string }
  > {
    const qs = new URLSearchParams({ profileId: params.profileId });
    if (params.accountId) qs.set("accountId", params.accountId);
    if (params.redirectUrl) {
      qs.set("redirect_url", params.redirectUrl);
      qs.set("redirectUrl", params.redirectUrl);
    }
    if (params.adAccountId) qs.set("adAccountId", params.adAccountId);
    if (params.adAccountIds && params.adAccountIds.length > 0) {
      for (const a of params.adAccountIds) qs.append("adAccountIds", a);
    }
    return this.request(`/connect/${params.platform}/ads?${qs.toString()}`);
  }

  /**
   * Create a Zernio Profile (workspace-like grouping for connected accounts).
   * Zernio's actual response shape is:
   *   { message: "...", profile: { _id, name, ... } }
   * so we unwrap.
   */
  async createProfile(params: { name: string; description?: string }): Promise<{ _id: string; name: string }> {
    const res = await this.request<
      | { _id: string; name: string }
      | { profile: { _id: string; name: string } }
    >(`/profiles`, {
      method: "POST",
      body: JSON.stringify(params),
    });
    if ("profile" in res && res.profile) return res.profile;
    return res as { _id: string; name: string };
  }

  async listProfiles(): Promise<{ profiles: { _id: string; name: string }[] }> {
    const res = await this.request<
      | { profiles?: { _id: string; name: string }[] }
      | { _id: string; name: string }[]
    >(`/profiles`);
    if (Array.isArray(res)) return { profiles: res };
    return { profiles: res.profiles ?? [] };
  }
}

let _zernio: ZernioClient | null = null;
export function getZernio(): ZernioClient {
  if (_zernio) return _zernio;
  _zernio = new ZernioClient();
  return _zernio;
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/**
 * Map our internal platform value (meta_ads / tiktok_ads / google_ads) to
 * the Zernio Ads API platform string.
 */
export function toZernioAdsPlatform(internal: string): ZernioAdsPlatform | null {
  switch (internal) {
    case "meta_ads":
    case "meta":
      return "facebook";
    case "tiktok_ads":
    case "tiktok":
      return "tiktok";
    case "google_ads":
      return "google";
    default:
      return null;
  }
}
