import { NextResponse } from "next/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const user = await requireAgencyStaff();
  if (!user.company_id) return NextResponse.json({ error: "No company" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const brandId = String(body.brand_id ?? "");
  const metric = String(body.metric ?? "");
  const target = Number(body.target_value);
  const direction = String(body.direction ?? "higher_is_better");

  if (!brandId || !metric || !Number.isFinite(target) || target < 0) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }
  const validMetrics = ["spend", "revenue", "conversions", "roas", "cpa", "ctr"];
  if (!validMetrics.includes(metric)) {
    return NextResponse.json({ error: "Unsupported metric" }, { status: 400 });
  }
  const validDirections = ["higher_is_better", "lower_is_better"];
  if (!validDirections.includes(direction)) {
    return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id, company_id")
    .eq("id", brandId)
    .maybeSingle();
  if (!brand || brand.company_id !== user.company_id) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  // Upsert: one active target per (brand, metric)
  const { data: existing } = await supabase
    .from("kpi_targets")
    .select("id")
    .eq("brand_id", brandId)
    .eq("metric", metric)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("kpi_targets")
      .update({ target_value: target, direction, updated_at: new Date().toISOString() })
      .eq("id", existing.id as string);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from("kpi_targets").insert({
      brand_id: brandId,
      company_id: user.company_id,
      metric,
      target_value: target,
      direction,
      is_active: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await requireAgencyStaff();
  if (!user.company_id) return NextResponse.json({ error: "No company" }, { status: 400 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("kpi_targets")
    .delete()
    .eq("id", id)
    .eq("company_id", user.company_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
