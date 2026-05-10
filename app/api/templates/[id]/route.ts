import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireMarketer } from "@/lib/auth/guards";
import { parse, topoSortFormulas } from "@/lib/formula/engine";
import { getCatalog } from "@/lib/templates/catalog";
import type { Platform, Level } from "@/lib/templates/catalog-types";

interface PatchBody {
  platform?: Platform;
  level?: Level;
  name?: string;
  fields?: { id: string; source: "field" | "formula" }[];
  formulas?: { id: string; name: string; expression: string; format: "number" | "currency" | "percent" | "ratio" }[];
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireMarketer();
  const { id } = await params;

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.platform && body.formulas && body.fields) {
    const catalog = getCatalog(body.platform);
    const platformFieldIds = new Set(catalog.fields.map((f) => f.id));
    const formulaIds = new Set(body.formulas.map((f) => f.id));
    const refsAvail = new Set([...platformFieldIds, ...formulaIds]);
    for (const f of body.formulas) {
      try {
        parse(f.expression, refsAvail);
      } catch (e) {
        return NextResponse.json({ error: `Formula "${f.name}": ${(e as Error).message}` }, { status: 400 });
      }
    }
    const sort = topoSortFormulas(body.formulas, platformFieldIds);
    if (sort.error) return NextResponse.json({ error: sort.error }, { status: 400 });
  }

  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.fields !== undefined) update.fields = body.fields;
  if (body.formulas !== undefined) update.formulas = body.formulas;

  const { error } = await supabase
    .from("report_templates")
    .update(update)
    .eq("id", id)
    .eq("owner_user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireMarketer();
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("report_templates")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
