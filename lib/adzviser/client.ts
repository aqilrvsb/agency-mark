// Adzviser API client wrapper.
// Each agency has its own API key stored in the adzviser_connections table.
// Master admin (you) sets/edits these keys via /platform/adzviser-keys.
//
// Phase 7 will flesh out the actual endpoints; this is the typed scaffold.

export type AdzviserPlatform = "meta" | "tiktok";

export interface AdzviserAdAccount {
  id: string;
  name: string;
  platform: AdzviserPlatform;
  currency: string;
  status: "active" | "disabled";
}

export interface AdzviserInsightsRow {
  ad_account_id: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions?: number;
  // ... 200+ FB columns will live here as a passthrough JSON
  [key: string]: unknown;
}

export class AdzviserClient {
  constructor(
    private apiKey: string,
    private workspaceId?: string,
    private baseUrl = "https://api.adzviser.com/v1"
  ) {}

  private async request<T>(
    path: string,
    init?: RequestInit
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(this.workspaceId ? { "X-Workspace-Id": this.workspaceId } : {}),
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      throw new Error(`Adzviser ${path} ${res.status}: ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  async listAdAccounts(platform: AdzviserPlatform): Promise<AdzviserAdAccount[]> {
    return this.request<AdzviserAdAccount[]>(`/accounts?platform=${platform}`);
  }

  async getInsights(params: {
    platform: AdzviserPlatform;
    ad_account_id: string;
    date_start: string; // YYYY-MM-DD
    date_end: string;
    fields?: string[];
  }): Promise<AdzviserInsightsRow[]> {
    const qs = new URLSearchParams({
      platform: params.platform,
      ad_account_id: params.ad_account_id,
      date_start: params.date_start,
      date_end: params.date_end,
      ...(params.fields ? { fields: params.fields.join(",") } : {}),
    });
    return this.request<AdzviserInsightsRow[]>(`/insights?${qs.toString()}`);
  }
}

// Helper: build client for a given agency (looks up API key from DB)
export async function getAdzviserForCompany(
  companyId: string,
  supabaseAdmin: { from: (t: string) => unknown } // SupabaseClient — kept loose to avoid circular import
): Promise<AdzviserClient | null> {
  const sb = supabaseAdmin as ReturnType<typeof import("@supabase/supabase-js").createClient>;
  const { data } = await sb
    .from("adzviser_connections")
    .select("api_key, workspace_id, is_active")
    .eq("company_id", companyId)
    .maybeSingle();
  if (!data || !data.is_active) return null;
  return new AdzviserClient(data.api_key as string, data.workspace_id as string | undefined);
}
