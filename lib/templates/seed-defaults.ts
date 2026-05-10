/**
 * Default templates seeded on every marketer signup.
 *
 * Three templates per platform → marketer's first dashboard already
 * has something useful before they touch the column picker. They
 * can clone, edit, or delete these freely.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface SeedRow {
  platform: "meta" | "tiktok" | "google";
  level: "campaign" | "adset" | "ad";
  name: string;
  description: string;
  fields: string[];
  formulas?: { id: string; name: string; expression: string; format: "number" | "currency" | "percent" | "ratio" }[];
}

const SEEDS: SeedRow[] = [
  // ─── Meta ──────────────────────────────────────────────────────────
  {
    platform: "meta",
    level: "campaign",
    name: "Performance Starter",
    description: "Daily-check view: spend, results, CPA, ROAS at a glance.",
    fields: [
      "campaign_name",
      "status",
      "spend",
      "results",
      "cost_per_result",
      "purchase_roas",
      "impressions",
      "clicks",
      "ctr",
      "cpm",
    ],
  },
  {
    platform: "meta",
    level: "ad",
    name: "Creative Health",
    description: "Hook rate, CTR, frequency — spot fatiguing creatives early.",
    fields: [
      "ad_name",
      "creative_thumbnail",
      "spend",
      "impressions",
      "frequency",
      "ctr",
      "video_views_3s",
      "thruplays",
      "quality_ranking",
    ],
    formulas: [
      {
        id: "hook_rate",
        name: "Hook rate",
        expression: "safeDiv(video_views_3s, impressions)",
        format: "percent",
      },
    ],
  },
  // ─── TikTok ────────────────────────────────────────────────────────
  {
    platform: "tiktok",
    level: "campaign",
    name: "Performance Starter",
    description: "Spend, results, CPA, ROAS at a glance for TikTok.",
    fields: [
      "campaign_name",
      "status",
      "spend",
      "results",
      "cost_per_result",
      "complete_payment_roas",
      "impressions",
      "clicks",
      "ctr",
      "cpm",
    ],
  },
  {
    platform: "tiktok",
    level: "ad",
    name: "Video Story",
    description: "Hook, hold, completion — TikTok's creative trinity.",
    fields: [
      "ad_name",
      "creative_thumbnail",
      "spend",
      "impressions",
      "video_views_2s",
      "video_views_6s",
      "video_p100",
      "hook_rate",
      "hold_rate",
      "completion_rate",
    ],
  },
  // ─── Google ────────────────────────────────────────────────────────
  {
    platform: "google",
    level: "campaign",
    name: "Performance Starter",
    description: "Conversions, cost-per-conv, and Search Impr. Share at a glance.",
    fields: [
      "campaign_name",
      "campaign_channel_type",
      "status",
      "spend",
      "conversions",
      "cost_per_conversion",
      "conversion_rate",
      "search_impression_share",
      "search_budget_lost_impression_share",
      "search_rank_lost_impression_share",
      "clicks",
      "ctr",
      "avg_cpc",
    ],
  },
];

export async function seedDefaultTemplates(
  admin: SupabaseClient,
  ownerUserId: string,
  companyId: string,
  brandId: string | null
) {
  const rows = SEEDS.map((s) => ({
    owner_user_id: ownerUserId,
    company_id: companyId,
    brand_id: brandId,
    platform: s.platform,
    level: s.level,
    name: s.name,
    description: s.description,
    fields: s.fields.map((id) => ({ id, source: "field" })),
    formulas: s.formulas ?? [],
    filters: { date_range: "last_30d" },
    is_default: true,
  }));
  const { error } = await admin.from("report_templates").insert(rows);
  if (error) {
    // Non-fatal — onboarding can continue without seeded templates
    console.error("[seed-defaults] failed:", error.message);
  }
}
