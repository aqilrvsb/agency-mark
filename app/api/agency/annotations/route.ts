import { NextResponse } from "next/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const user = await requireAgencyStaff();
  if (!user.company_id) return NextResponse.json({ error: "No company" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const brandId = String(body.brand_id ?? "");
  const anchorDate = String(body.anchor_date ?? "");
  const bodyText = String(body.body ?? "").trim();
  if (!brandId || !anchorDate || !bodyText) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (bodyText.length > 280) {
    return NextResponse.json({ error: "Body too long (max 280 chars)" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchorDate)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify brand belongs to this agency
  const { data: brand } = await supabase
    .from("brands")
    .select("id, company_id")
    .eq("id", brandId)
    .maybeSingle();
  if (!brand || brand.company_id !== user.company_id) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("chart_annotations")
    .insert({
      brand_id: brandId,
      company_id: user.company_id,
      author_id: user.id,
      anchor_date: anchorDate,
      body: bodyText,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, annotation: data });
}

export async function DELETE(req: Request) {
  const user = await requireAgencyStaff();
  if (!user.company_id) return NextResponse.json({ error: "No company" }, { status: 400 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("chart_annotations")
    .delete()
    .eq("id", id)
    .eq("company_id", user.company_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
