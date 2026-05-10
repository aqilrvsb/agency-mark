import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireMarketer } from "@/lib/auth/guards";
import { parse, collectRefs, topoSortFormulas } from "@/lib/formula/engine";
import { getCatalog } from "@/lib/templates/catalog";
import type { Platform, Level } from "@/lib/templates/catalog-types";

interface FieldToken {
  id: string;
  source: "field" | "formula";
}
interface FormulaSpec {
  id: string;
  name: string;
  expression: string;
  format: "number" | "currency" | "percent" | "ratio";
}

interface CreateBody {
  platform: Platform;
  level: Level;
  name: string;
  fields: FieldToken[];
  formulas: FormulaSpec[];
  description?: string;
}

export async function POST(req: Request) {
  const user = await requireMarketer();
  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = validateTemplate(body);
  if (validation.error) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_templates")
    .insert({
      owner_user_id: user.id,
      company_id: user.company_id,
      platform: body.platform,
      level: body.level,
      name: body.name.trim(),
      description: body.description ?? null,
      fields: body.fields,
      formulas: body.formulas,
      filters: { date_range: "last_30d" },
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}

function validateTemplate(body: CreateBody): { error?: string } {
  if (!body.name?.trim()) return { error: "Name required" };
  if (!body.platform || !["meta", "tiktok", "google"].includes(body.platform)) {
    return { error: "Invalid platform" };
  }
  if (!body.level || !["campaign", "adset", "ad"].includes(body.level)) {
    return { error: "Invalid level" };
  }
  if (!Array.isArray(body.fields) || body.fields.length === 0) {
    return { error: "Pick at least one column" };
  }

  const catalog = getCatalog(body.platform);
  const platformFieldIds = new Set(catalog.fields.map((f) => f.id));
  const formulaIds = new Set(body.formulas.map((f) => f.id));

  // Validate formulas: parse each, ensure refs exist, check cycles.
  const refsAvail = new Set([...platformFieldIds, ...formulaIds]);
  for (const f of body.formulas) {
    if (!f.id || !f.name || !f.expression) return { error: `Formula incomplete: ${f.name}` };
    if (platformFieldIds.has(f.id)) return { error: `Formula id "${f.id}" collides with platform field` };
    try {
      parse(f.expression, refsAvail);
    } catch (e) {
      return { error: `Formula "${f.name}": ${(e as Error).message}` };
    }
  }
  const sort = topoSortFormulas(body.formulas, platformFieldIds);
  if (sort.error) return { error: sort.error };

  // Validate field refs in the columns array
  for (const t of body.fields) {
    if (t.source === "field" && !platformFieldIds.has(t.id)) {
      return { error: `Unknown field: ${t.id}` };
    }
    if (t.source === "formula" && !formulaIds.has(t.id)) {
      return { error: `Formula not defined: ${t.id}` };
    }
  }
  return {};
}
