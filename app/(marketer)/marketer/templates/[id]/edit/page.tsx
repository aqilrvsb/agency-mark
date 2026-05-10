import { requireMarketer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getCatalog } from "@/lib/templates/catalog";
import { TemplateBuilder } from "@/components/marketer/template-builder";
import { notFound } from "next/navigation";
import type { Level, Platform } from "@/lib/templates/catalog-types";

export const dynamic = "force-dynamic";

const PLATFORM_LABEL: Record<Platform, string> = {
  meta: "Facebook Ads",
  tiktok: "TikTok Ads",
  google: "Google Ads",
};

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireMarketer();
  const { id } = await params;

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("report_templates")
    .select("id, platform, level, name, fields, formulas")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!row) notFound();

  const platform = row.platform as Platform;
  const level = row.level as Level;
  const catalog = getCatalog(platform);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)] mb-1">
            Edit template · {PLATFORM_LABEL[platform]}
          </p>
        </header>

        <TemplateBuilder
          catalog={catalog}
          level={level}
          isEdit
          initial={{
            id: row.id as string,
            name: row.name as string,
            fields: (row.fields as unknown as { id: string; source: "field" | "formula" }[]) ?? [],
            formulas:
              (row.formulas as unknown as {
                id: string;
                name: string;
                expression: string;
                format: "number" | "currency" | "percent" | "ratio";
              }[]) ?? [],
          }}
        />
      </div>
    </div>
  );
}
