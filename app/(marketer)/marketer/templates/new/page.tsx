import { requireMarketer } from "@/lib/auth/guards";
import { getCatalog, getDefaultFieldIds } from "@/lib/templates/catalog";
import { TemplateBuilder } from "@/components/marketer/template-builder";
import type { Level, Platform } from "@/lib/templates/catalog-types";

export const dynamic = "force-dynamic";

const PLATFORM_LABEL: Record<Platform, string> = {
  meta: "Facebook Ads",
  tiktok: "TikTok Ads",
  google: "Google Ads",
};

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; level?: string }>;
}) {
  await requireMarketer();
  const sp = await searchParams;

  const platform = (sp.platform === "tiktok" || sp.platform === "google" ? sp.platform : "meta") as Platform;
  const level = (sp.level === "adset" || sp.level === "ad" ? sp.level : "campaign") as Level;

  const catalog = getCatalog(platform);
  const defaults = getDefaultFieldIds(platform, level);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)] mb-1">
            New template
          </p>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-[var(--color-text-primary)]">
            {PLATFORM_LABEL[platform]}
          </h1>
          <div className="mt-2 flex gap-1">
            {(["campaign", "adset", "ad"] as const).map((l) => (
              <a
                key={l}
                href={`/marketer/templates/new?platform=${platform}&level=${l}`}
                className={`px-3 py-1 text-[12px] rounded-md ${
                  l === level
                    ? "bg-[var(--color-orange-tint)] text-[var(--color-orange)] border border-[var(--color-orange-soft)]"
                    : "text-[var(--color-text-secondary)] hover:bg-white/5 border border-transparent"
                }`}
              >
                {l === "adset" ? (platform === "google" || platform === "tiktok" ? "Ad group" : "Ad set") : l[0].toUpperCase() + l.slice(1)}
              </a>
            ))}
          </div>
        </header>

        <TemplateBuilder
          catalog={catalog}
          level={level}
          isEdit={false}
          initial={{
            name: "",
            fields: defaults.map((id) => ({ id, source: "field" as const })),
            formulas: [],
          }}
        />
      </div>
    </div>
  );
}
