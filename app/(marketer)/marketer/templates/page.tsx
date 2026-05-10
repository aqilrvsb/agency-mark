import { requireMarketer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

interface TemplateRow {
  id: string;
  platform: "meta" | "tiktok" | "google";
  level: "campaign" | "adset" | "ad";
  name: string;
  description: string | null;
  fields: { id: string; source: string }[];
  formulas: { id: string; name: string }[];
  is_default: boolean;
  updated_at: string;
}

const PLATFORM_LABEL: Record<string, string> = {
  meta: "Facebook Ads",
  tiktok: "TikTok Ads",
  google: "Google Ads",
};

const PLATFORM_COLOR: Record<string, string> = {
  meta: "#1877F2",
  tiktok: "#25F4EE",
  google: "#4285F4",
};

const LEVEL_LABEL: Record<string, string> = {
  campaign: "Campaign",
  adset: "Ad set / group",
  ad: "Ad",
};

export default async function TemplatesIndexPage() {
  const user = await requireMarketer();
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("report_templates")
    .select("id, platform, level, name, description, fields, formulas, is_default, updated_at")
    .eq("owner_user_id", user.id)
    .is("archived_at", null)
    .order("platform")
    .order("level")
    .order("created_at");

  const templates = (rows ?? []) as unknown as TemplateRow[];
  const grouped = new Map<string, TemplateRow[]>();
  for (const t of templates) {
    const k = t.platform;
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(t);
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-[var(--color-text-primary)]">
              Report templates
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Custom column sets + formulas for your Facebook, TikTok &amp; Google reports. Pick a
              platform to start a new one.
            </p>
          </div>
          <NewTemplateMenu />
        </header>

        {(["meta", "tiktok", "google"] as const).map((platform) => {
          const list = grouped.get(platform) ?? [];
          return (
            <section key={platform} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="size-2 rounded-full"
                  style={{ background: PLATFORM_COLOR[platform] }}
                  aria-hidden
                />
                <h2 className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
                  {PLATFORM_LABEL[platform]}
                </h2>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {list.length} template{list.length === 1 ? "" : "s"}
                </span>
              </div>
              {list.length === 0 ? (
                <EmptyCard platform={platform} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map((t) => (
                    <TemplateCard key={t.id} t={t} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TemplateCard({ t }: { t: TemplateRow }) {
  const fieldCount = t.fields?.length ?? 0;
  const formulaCount = t.formulas?.length ?? 0;
  return (
    <Link
      href={`/marketer/templates/${t.id}/edit`}
      className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 hover:border-[var(--color-border-bright)] transition-colors flex flex-col gap-2"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[14px] font-semibold tracking-tight text-[var(--color-text-primary)] line-clamp-2 group-hover:text-[var(--color-orange)]">
          {t.name}
        </h3>
        {t.is_default && (
          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-orange)] shrink-0 mt-0.5">
            Default
          </span>
        )}
      </div>
      {t.description && (
        <p className="text-[12px] text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
          {t.description}
        </p>
      )}
      <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--color-text-muted)] tabular-nums">
        <span>{LEVEL_LABEL[t.level]}</span>
        <span>·</span>
        <span>{fieldCount} columns</span>
        {formulaCount > 0 && (
          <>
            <span>·</span>
            <span>{formulaCount} formula{formulaCount === 1 ? "" : "s"}</span>
          </>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
        <Link
          href={`/marketer/reports/${t.id}`}
          className="text-[11px] text-[var(--color-orange)] hover:underline"
        >
          Run report →
        </Link>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          {new Date(t.updated_at).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}

function EmptyCard({ platform }: { platform: "meta" | "tiktok" | "google" }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white/[0.02] p-6 flex items-center gap-4">
      <FileText className="text-[var(--color-text-muted)] shrink-0" size={20} />
      <div className="flex-1">
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          No templates yet for {PLATFORM_LABEL[platform]}.
        </p>
      </div>
      <Link
        href={`/marketer/templates/new?platform=${platform}&level=campaign`}
        className="text-[12px] font-semibold text-[var(--color-orange)] hover:underline"
      >
        New template →
      </Link>
    </div>
  );
}

function NewTemplateMenu() {
  return (
    <details className="relative">
      <summary className="list-none cursor-pointer flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--color-orange)] text-black text-[13px] font-semibold hover:bg-[var(--color-orange-hover)]">
        <Plus size={14} /> New template
      </summary>
      <div className="absolute right-0 mt-2 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-xl py-1 z-10">
        {(["meta", "tiktok", "google"] as const).map((p) => (
          <Link
            key={p}
            href={`/marketer/templates/new?platform=${p}&level=campaign`}
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--color-text-primary)] hover:bg-white/5"
          >
            <span className="size-2 rounded-full" style={{ background: PLATFORM_COLOR[p] }} />
            {PLATFORM_LABEL[p]}
          </Link>
        ))}
      </div>
    </details>
  );
}
