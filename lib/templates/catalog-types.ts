/**
 * Field-catalog types for the Fighter template builder.
 *
 * The catalog is a static, per-platform manifest of every metric/dimension
 * a marketer can check. Each field declares: where it sits in the UI tree
 * (tab → category → group), how to format the value, what level(s) it's
 * valid at, and the data path inside `ad_data.data` JSONB to read at
 * render time.
 *
 * Stored in code (not DB) so when a platform adds a field we just ship a
 * code change — no migration needed.
 */

export type Platform = "meta" | "tiktok" | "google";
export type Level = "campaign" | "adset" | "ad";
export type FieldFormat =
  | "number" // 1,234
  | "currency" // RM 1,234.56
  | "percent" // 12.34%
  | "ratio" // 1.23×
  | "duration" // 2.4s
  | "text"
  | "thumbnail";

/** Where this field lives in the tabbed UI (mirrors Meta Ads Manager). */
export type Tab = "key_metrics" | "tracking" | "ad_settings" | "advanced" | "custom";

export interface CatalogField {
  /** Stable ID — the value stored in `report_templates.fields`. */
  id: string;
  /** Human label in the picker + table header. */
  label: string;
  /** Optional sublabel / unit hint shown next to the checkbox. */
  hint?: string;
  /** One-liner shown on hover. */
  description?: string;
  format: FieldFormat;
  /** UI tab this field appears in. */
  tab: Tab;
  /** Category the section header within the tab. */
  category: string;
  /** Group within the category — used for the "5 selected" sub-section header. */
  group?: string;
  /** Levels the field is valid at. Empty = all levels. */
  validLevels?: Level[];
  /** Default-checked when a marketer creates a fresh template (mirrors Meta's default columns). */
  isDefault?: boolean;
  /** True when the field is featured in the header tab; rest live behind "Show all". */
  isFeatured?: boolean;
  /** JSONB path inside ad_data.data to extract this field at render time. */
  path: string;
  /** Inverted delta convention: when true, "up" is bad (CPA, CPM). */
  invertDelta?: boolean;
  /** Aggregation function across rows for the level rollup. Default 'sum'. */
  agg?: "sum" | "avg" | "max" | "min" | "weighted_avg";
  /** When agg=weighted_avg, the field whose sum is the denominator. */
  aggWeight?: string;
}

export interface PlatformCatalog {
  platform: Platform;
  /** Display name. */
  label: string;
  /** Brand color used in the picker tabs. */
  brandColor: string;
  /** Tabs in display order. */
  tabs: { id: Tab; label: string }[];
  /** Categories, ordered. Each category groups one or more groups. */
  categories: {
    tab: Tab;
    name: string;
    /** Sub-groups within this category. */
    groups: string[];
  }[];
  fields: CatalogField[];
}

/** Quick lookups built once per request. */
export function indexCatalog(cat: PlatformCatalog) {
  const byId = new Map<string, CatalogField>();
  for (const f of cat.fields) byId.set(f.id, f);
  const byTab = new Map<Tab, CatalogField[]>();
  for (const f of cat.fields) {
    const arr = byTab.get(f.tab) ?? [];
    arr.push(f);
    byTab.set(f.tab, arr);
  }
  return { byId, byTab };
}
