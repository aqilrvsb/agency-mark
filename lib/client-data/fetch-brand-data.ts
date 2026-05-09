import { createClient } from "@/lib/supabase/server";
import { aggregateAdData, summarize, type AdLevel } from "./aggregate";

/**
 * Shared loader for the per-platform pages on the client portal.
 * Returns the assigned brand + 30-day aggregated rows for the level.
 */
export async function loadBrandLevelData(opts: {
  userId: string;
  platforms: string[];
  level: AdLevel;
  days?: number;
}) {
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("assigned_client_user_id", opts.userId)
    .maybeSingle();

  if (!brand) return { brand: null, rows: [], totals: null };

  const start = new Date();
  start.setDate(start.getDate() - (opts.days ?? 30));
  const startIso = start.toISOString().slice(0, 10);

  const { data: adData } = await supabase
    .from("ad_data")
    .select("platform, date_start, data")
    .eq("brand_id", brand.id as string)
    .in("platform", opts.platforms)
    .gte("date_start", startIso);

  const rows = aggregateAdData(adData ?? [], opts.level);
  const totals = summarize(rows);

  return { brand: { id: brand.id as string, name: brand.name as string }, rows, totals };
}
