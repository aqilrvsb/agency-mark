// In-memory OAuth state store for Peningads connect flow.
// Single-region (sin1) Vercel deployment shares module state per lambda
// instance. For multi-instance robustness, move to a Supabase table.

const STATE_TTL_MS = 15 * 60 * 1000;

export interface PendingOAuthState {
  user_id: string;
  brand_id: string;
  platform: string; // internal platform value (meta_ads, meta_insights, google_ads, tiktok_ads)
  expires_at: number;
}

const pending = new Map<string, PendingOAuthState>();

export function setPendingState(state: string, payload: Omit<PendingOAuthState, "expires_at">) {
  pending.set(state, { ...payload, expires_at: Date.now() + STATE_TTL_MS });

  // Lazy cleanup of expired
  for (const [k, v] of pending) {
    if (v.expires_at < Date.now()) pending.delete(k);
  }
}

export function consumePendingState(state: string): PendingOAuthState | undefined {
  const s = pending.get(state);
  if (!s) return undefined;
  if (s.expires_at < Date.now()) {
    pending.delete(state);
    return undefined;
  }
  pending.delete(state); // single-use
  return s;
}
