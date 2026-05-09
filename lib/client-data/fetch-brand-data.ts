import { createClient } from "@/lib/supabase/server";
import { aggregateAdData, summarize, type AdLevel } from "./aggregate";

/**
 * Shared loader for the per-platform pages on the client portal.
 * Returns the assigned brand + aggregated rows for the level over the
 * given date range (defaults: last 30 days).
 */
export async function loadBrandLevelData(opts: {
  userId: string;
  platforms: string[];
  level: AdLevel;
  start?: string; // YYYY-MM-DD
  end?: string;   // YYYY-MM-DD
}) {
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("assigned_client_user_id", opts.userId)
    .maybeSingle();

  if (!brand) return { brand: null, rows: [], totals: null };

  const today = new Date().toISOString().slice(0, 10);
  const defaultStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();

  const startIso = opts.start ?? defaultStart;
  const endIso = opts.end ?? today;

  const { data: adData } = await supabase
    .from("ad_data")
    .select("platform, date_start, data")
    .eq("brand_id", brand.id as string)
    .in("platform", opts.platforms)
    .gte("date_start", startIso)
    .lte("date_start", endIso);

  const rows = aggregateAdData(adData ?? [], opts.level);
  const totals = summarize(rows);

  return { brand: { id: brand.id as string, name: brand.name as string }, rows, totals };
}
