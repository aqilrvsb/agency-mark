import type { Json } from "@/lib/supabase/types";

export type AdLevel = "campaign" | "adset" | "ad";

export interface AggregateRow {
  key: string;
  name: string;
  status: string | null;
  objective: string | null;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  cpa: number;
  conversionRate: number;
  revenue: number;
  roas: number;
  frequency: number;
  videoViews: number;
}

interface AdDataRow {
  platform: string;
  date_start: string;
  data: Json;
}

function pickString(d: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = d[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

function pickNumber(d: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = d[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v !== "") {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

const KEY_FIELDS: Record<AdLevel, { id: string[]; name: string[] }> = {
  campaign: {
    id: ["campaign_id", "campaign_id_string"],
    name: ["campaign_name", "campaign"],
  },
  adset: {
    id: ["adset_id", "ad_set_id", "adgroup_id", "ad_group_id"],
    name: ["adset_name", "ad_set_name", "adgroup_name", "ad_group_name"],
  },
  ad: {
    id: ["ad_id", "ad_id_string"],
    name: ["ad_name", "ad", "creative_name"],
  },
};

export function aggregateAdData(rows: AdDataRow[], level: AdLevel): AggregateRow[] {
  const buckets = new Map<string, AggregateRow & { _reachUnion: Set<string>; _denomDays: number }>();
  const fields = KEY_FIELDS[level];

  for (const row of rows) {
    const d = (row.data as Record<string, unknown>) || {};
    const key = pickString(d, fields.id) ?? pickString(d, fields.name);
    if (!key) continue;
    const name = pickString(d, fields.name) ?? key;

    const existing = buckets.get(key) ?? {
      key,
      name,
      status: pickString(d, ["status", "campaign_status", "effective_status", "delivery"]),
      objective: pickString(d, ["objective", "campaign_objective", "buying_type"]),
      spend: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      conversions: 0,
      cpa: 0,
      conversionRate: 0,
      revenue: 0,
      roas: 0,
      frequency: 0,
      videoViews: 0,
      _reachUnion: new Set<string>(),
      _denomDays: 0,
    };

    existing.spend += pickNumber(d, ["spend", "cost", "amount_spent"]);
    existing.impressions += pickNumber(d, ["impressions"]);
    existing.reach += pickNumber(d, ["reach", "unique_users"]);
    existing.clicks += pickNumber(d, [
      "clicks",
      "link_clicks",
      "inline_link_clicks",
      "outbound_clicks",
    ]);
    existing.conversions += pickNumber(d, [
      "conversions",
      "results",
      "purchases",
      "leads",
      "actions_purchase",
      "all_conversions",
    ]);
    existing.revenue += pickNumber(d, ["purchase_value", "conversion_value", "revenue"]);
    existing.videoViews += pickNumber(d, [
      "video_views",
      "video_plays",
      "video_view",
      "two_second_continuous_video_views",
    ]);
    existing._denomDays += 1;

    buckets.set(key, existing);
  }

  const out: AggregateRow[] = [];
  for (const r of buckets.values()) {
    r.ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
    r.cpc = r.clicks > 0 ? r.spend / r.clicks : 0;
    r.cpm = r.impressions > 0 ? (r.spend / r.impressions) * 1000 : 0;
    r.cpa = r.conversions > 0 ? r.spend / r.conversions : 0;
    r.conversionRate = r.clicks > 0 ? (r.conversions / r.clicks) * 100 : 0;
    r.roas = r.spend > 0 ? r.revenue / r.spend : 0;
    r.frequency = r.reach > 0 ? r.impressions / r.reach : 0;
    out.push(r);
  }

  out.sort((a, b) => b.spend - a.spend);
  return out;
}

export function summarize(rows: AggregateRow[]) {
  const total = rows.reduce(
    (acc, r) => {
      acc.spend += r.spend;
      acc.impressions += r.impressions;
      acc.reach += r.reach;
      acc.clicks += r.clicks;
      acc.conversions += r.conversions;
      acc.revenue += r.revenue;
      acc.videoViews += r.videoViews;
      return acc;
    },
    { spend: 0, impressions: 0, reach: 0, clicks: 0, conversions: 0, revenue: 0, videoViews: 0 }
  );
  return {
    ...total,
    ctr: total.impressions > 0 ? (total.clicks / total.impressions) * 100 : 0,
    cpc: total.clicks > 0 ? total.spend / total.clicks : 0,
    cpm: total.impressions > 0 ? (total.spend / total.impressions) * 1000 : 0,
    cpa: total.conversions > 0 ? total.spend / total.conversions : 0,
    conversionRate: total.clicks > 0 ? (total.conversions / total.clicks) * 100 : 0,
    roas: total.spend > 0 ? total.revenue / total.spend : 0,
    frequency: total.reach > 0 ? total.impressions / total.reach : 0,
  };
}

/**
 * Parse YYYY-MM-DD date range from URL search params with sensible defaults.
 *
 * Default = last 90 days. This matches Zernio's discovery-backfill window
 * (the platform pulls 90 days of historical ads on initial connection),
 * so a freshly-connected brand sees data immediately. Users can narrow
 * via the "Last 7 / 30 / 90 days" date-range picker.
 */
export function parseDateRange(search: { start?: string; end?: string }, defaultDays = 90) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const defaultStart = new Date(today);
  defaultStart.setDate(defaultStart.getDate() - defaultDays);
  const defaultStartIso = defaultStart.toISOString().slice(0, 10);

  const isValid = (s: string | undefined) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  return {
    start: isValid(search.start) ? search.start! : defaultStartIso,
    end: isValid(search.end) ? search.end! : todayIso,
  };
}
