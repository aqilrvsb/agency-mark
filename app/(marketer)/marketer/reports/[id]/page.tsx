import { requireMarketer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Edit2 } from "lucide-react";
import { getCatalog } from "@/lib/templates/catalog";
import { parse, topoSortFormulas, evalFormulas, type FormulaSpec } from "@/lib/formula/engine";
import { aggregateAdData, parseDateRange, type AggregateRow } from "@/lib/client-data/aggregate";
import { DateRangePicker } from "@/components/client/date-range-picker";
import { ReportTable, type ReportColumn, type ReportRow } from "@/components/marketer/report-table";
import type { Level, Platform, CatalogField } from "@/lib/templates/catalog-types";

export const dynamic = "force-dynamic";

const PLATFORM_TO_DB: Record<Platform, string[]> = {
  meta: ["meta_ads", "meta"],
  tiktok: ["tiktok_ads", "tiktok"],
  google: ["google_ads"],
};

const LEVEL_LABEL: Record<Level, string> = {
  campaign: "Campaign",
  adset: "Ad set",
  ad: "Ad",
};

interface FieldToken {
  id: string;
  source: "field" | "formula";
}

interface TemplateRow {
  id: string;
  platform: Platform;
  level: Level;
  name: string;
  fields: FieldToken[];
  formulas: FormulaSpec[];
}

export default async function RunReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const user = await requireMarketer();
  const { id } = await params;
  const sp = await searchParams;
  const { start, end } = parseDateRange(sp);

  const supabase = await createClient();
  const { data: tplRow } = await supabase
    .from("report_templates")
    .select("id, platform, level, name, fields, formulas")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!tplRow) notFound();
  const tpl = tplRow as unknown as TemplateRow;
  const catalog = getCatalog(tpl.platform);
  const fieldById = new Map<string, CatalogField>(catalog.fields.map((f) => [f.id, f]));

  // Find brand owned by this marketer
  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!brand) {
    return <EmptyState title={tpl.name} message="Connect your first ad account to run this report." />;
  }

  // Pull rows
  const { data: rawRows } = await supabase
    .from("ad_data")
    .select("platform, date_start, data")
    .eq("brand_id", brand.id as string)
    .in("platform", PLATFORM_TO_DB[tpl.platform])
    .gte("date_start", start)
    .lte("date_start", end);

  const aggregated: AggregateRow[] = aggregateAdData(rawRows ?? [], tpl.level);

  // Compile formulas for the platform
  const platformFieldIds = new Set(catalog.fields.map((f) => f.id));
  let compiledFormulas: { spec: FormulaSpec; ast: ReturnType<typeof parse> }[] = [];
  if (tpl.formulas?.length) {
    const sort = topoSortFormulas(tpl.formulas, platformFieldIds);
    if (sort.error) {
      return <ErrorState title={tpl.name} message={sort.error} templateId={tpl.id} />;
    }
    compiledFormulas = sort.order.map((o) => ({ spec: o.spec, ast: o.ast }));
  }

  // Resolve every column → label, format, accessor
  const columns: ReportColumn[] = tpl.fields.map((token) => {
    if (token.source === "field") {
      const f = fieldById.get(token.id);
      if (!f) return null;
      return {
        id: f.id,
        label: f.label,
        format: f.format,
        path: f.path,
        align: (f.format === "currency" || f.format === "number" || f.format === "percent" || f.format === "ratio") ? "right" : "left",
      } as ReportColumn;
    }
    const fm = tpl.formulas.find((x) => x.id === token.id);
    if (!fm) return null;
    return {
      id: fm.id,
      label: fm.name,
      format: fm.format,
      path: fm.id,
      align: "right",
    } as ReportColumn;
  }).filter((x): x is ReportColumn => x !== null);

  // Build rows: map aggregate → field values, then evaluate formulas.
  // For Ad-level reports, also bundle the creative metadata so the client
  // table can open the lightbox modal on row click.
  const renderedRows: ReportRow[] = aggregated.map((agg) => {
    const values = evalFormulas(compiledFormulas, aggregateToRow(agg));
    if (tpl.level !== "ad") return { values };
    return {
      values,
      media: {
        name: agg.name,
        status: agg.status,
        campaignName: agg.campaignName,
        adsetName: agg.adsetName,
        creativeBody: agg.creativeBody,
        creativeThumbnail: agg.creativeThumbnail,
        creativeImageUrl: agg.creativeImageUrl,
        creativeVideoUrl: agg.creativeVideoUrl,
        creativeVideoId: agg.creativeVideoId,
        spend: agg.spend,
        impressions: agg.impressions,
        clicks: agg.clicks,
        ctr: agg.ctr,
        roas: agg.roas,
      },
    };
  });

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-5 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)] mb-1">
              {catalog.label} · {LEVEL_LABEL[tpl.level]}
            </p>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-[var(--color-text-primary)]">
              {tpl.name}
            </h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {brand.name as string} · {start} → {end} · {aggregated.length} row{aggregated.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangePicker />
            <Link
              href={`/marketer/templates/${tpl.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-white/5 hover:text-[var(--color-text-primary)]"
            >
              <Edit2 size={13} /> Edit columns
            </Link>
          </div>
        </header>

        <ReportTable columns={columns} rows={renderedRows} />
      </div>
    </div>
  );
}

function aggregateToRow(agg: AggregateRow): Record<string, number | null> {
  // Maps the canonical AggregateRow fields onto the catalog `path` keys.
  // Most paths are direct field names from AggregateRow; unknown paths
  // fall through as null and render as "—".
  const row: Record<string, number | null> = {};
  // numeric
  row.spend = agg.spend;
  row.impressions = agg.impressions;
  row.reach = agg.reach;
  row.clicks = agg.clicks;
  row.ctr = agg.ctr;
  row.cpc = agg.cpc;
  row.cpm = agg.cpm;
  row.conversions = agg.conversions;
  row.cpa = agg.cpa;
  row.conversionRate = agg.conversionRate;
  row.revenue = agg.revenue;
  row.roas = agg.roas;
  row.frequency = agg.frequency;
  row.video_plays = agg.videoViews;
  // text fields stuffed in too — formatters handle non-numeric
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (row as any).campaign_name = agg.campaignName ?? agg.name;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (row as any).adset_name = agg.adsetName ?? agg.name;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (row as any).adgroup_name = agg.adsetName ?? agg.name;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (row as any).ad_name = agg.name;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (row as any).ad_group_name = agg.adsetName ?? agg.name;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (row as any).status = agg.status;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (row as any).objective = agg.objective;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (row as any).creative_thumbnail = agg.creativeThumbnail;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (row as any).creative_body = agg.creativeBody;
  return row;
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-display font-extrabold tracking-tight text-[var(--color-text-primary)] mb-3">
          {title}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">{message}</p>
        <Link
          href="/client/connections"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--color-orange)] text-black text-sm font-semibold hover:bg-[var(--color-orange-hover)]"
        >
          Connect ad account →
        </Link>
      </div>
    </div>
  );
}

function ErrorState({ title, message, templateId }: { title: string; message: string; templateId: string }) {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-display font-extrabold tracking-tight text-[var(--color-text-primary)] mb-3">
          {title}
        </h1>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.07] p-4 mb-4">
          <p className="text-sm text-rose-300">{message}</p>
        </div>
        <Link
          href={`/marketer/templates/${templateId}/edit`}
          className="text-sm text-[var(--color-orange)] hover:underline"
        >
          Edit template →
        </Link>
      </div>
    </div>
  );
}
