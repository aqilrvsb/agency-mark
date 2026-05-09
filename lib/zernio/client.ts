// Zernio REST API client.
// Docs: https://docs.zernio.com — auth via Bearer token from ZERNIO_API_KEY.
// One master Zernio account per AdSolution deployment; client connections are
// added under it via OAuth (each client = 1 connected social account).

export type ZernioPlatform = "facebook" | "instagram" | "tiktok" | "linkedin" | "twitter" | "pinterest" | "youtube";

export interface ZernioAccount {
  id: string;
  platform: ZernioPlatform;
  handle: string;
  display_name?: string;
  is_active: boolean;
  connected_at: string;
}

export interface ZernioAdAnalyticsRow {
  date: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  conversions?: number;
  roas?: number;
  [key: string]: unknown;
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

  async listAccounts(): Promise<ZernioAccount[]> {
    const res = await this.request<{ accounts: ZernioAccount[] } | ZernioAccount[]>("/accounts");
    return Array.isArray(res) ? res : res.accounts;
  }

  async getAccount(accountId: string): Promise<ZernioAccount> {
    return this.request<ZernioAccount>(`/accounts/${accountId}`);
  }

  /**
   * Fetch ad analytics for a connected ad account.
   * platform: meta_ads | tiktok_ads | meta_insights
   */
  async getAdAnalytics(params: {
    accountId: string;
    platform: "meta_ads" | "tiktok_ads" | "meta_insights" | "google_ads";
    dateStart: string;
    dateEnd: string;
    breakdowns?: string[];
  }): Promise<ZernioAdAnalyticsRow[]> {
    const qs = new URLSearchParams({
      platform: params.platform,
      account_id: params.accountId,
      date_start: params.dateStart,
      date_end: params.dateEnd,
      ...(params.breakdowns ? { breakdowns: params.breakdowns.join(",") } : {}),
    });
    const res = await this.request<{ rows: ZernioAdAnalyticsRow[] } | ZernioAdAnalyticsRow[]>(
      `/ads/analytics?${qs.toString()}`
    );
    return Array.isArray(res) ? res : res.rows;
  }

  /**
   * Build an OAuth URL that the user is redirected to in order to connect
   * a new social account.
   * Zernio expects: GET /connect/{platform}?profileId={profileId}
   * The connection is associated with a Zernio Profile, which we create
   * per brand on first connect.
   */
  async getConnectUrl(params: {
    platform: ZernioPlatform;
    profileId: string;
  }): Promise<{ authUrl: string }> {
    const qs = new URLSearchParams({ profileId: params.profileId });
    return this.request<{ authUrl: string }>(`/connect/${params.platform}?${qs.toString()}`);
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
