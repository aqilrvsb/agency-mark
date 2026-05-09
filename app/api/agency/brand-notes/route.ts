import { NextResponse } from "next/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const user = await requireAgencyStaff();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { brand_id, body: noteBody } = body;
  if (!brand_id || !noteBody?.trim()) {
    return NextResponse.json({ error: "brand_id and body required" }, { status: 400 });
  }

  const admin = createAdminClient();
  // Verify brand belongs to caller's company
  const { data: brand } = await admin
    .from("brands")
    .select("id, company_id")
    .eq("id", brand_id)
    .eq("company_id", user.company_id)
    .maybeSingle();
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const { data, error } = await admin
    .from("brand_notes")
    .insert({
      brand_id,
      company_id: user.company_id,
      author_id: user.id,
      body: noteBody.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}
