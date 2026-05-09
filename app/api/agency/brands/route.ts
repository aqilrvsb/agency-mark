import { NextResponse } from "next/server";
import { requireAgencyLeadership } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const user = await requireAgencyLeadership();
  const body = await req.json().catch(() => null);
  if (!body || !body.name) {
    return NextResponse.json({ error: "Brand name required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: brand, error } = await admin
    .from("brands")
    .insert({
      company_id: user.company_id,
      name: body.name,
      contact_email: body.contact_email || null,
      contact_phone: body.contact_phone || null,
      is_active: true,
    })
    .select()
    .single();

  if (error || !brand) return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });

  // Initialize budget row
  await admin.from("client_budgets").insert({
    brand_id: brand.id,
    company_id: user.company_id,
    current_balance_myr: 0,
  });

  return NextResponse.json({ ok: true, brand_id: brand.id });
}
