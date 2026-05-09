import { NextResponse } from "next/server";
import { requireAgencyLeadership } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const user = await requireAgencyLeadership();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { brand_id, amount_myr, payment_method, reference } = body;
  if (!brand_id || !amount_myr || amount_myr <= 0) {
    return NextResponse.json({ error: "brand_id and positive amount_myr required" }, { status: 400 });
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

  // Insert topup record (status=success since this is admin recording a confirmed payment)
  const { data: topup, error: topupErr } = await admin
    .from("budget_topups")
    .insert({
      brand_id,
      amount_myr,
      payment_method: payment_method ?? null,
      reference: reference ?? null,
      status: "success",
    })
    .select()
    .single();

  if (topupErr) return NextResponse.json({ error: topupErr.message }, { status: 500 });

  // Update client_budgets aggregate
  const { data: existing } = await admin
    .from("client_budgets")
    .select("id, current_balance_myr, total_topup_myr")
    .eq("brand_id", brand_id)
    .maybeSingle();

  if (existing) {
    await admin
      .from("client_budgets")
      .update({
        current_balance_myr: Number(existing.current_balance_myr) + Number(amount_myr),
        total_topup_myr: Number(existing.total_topup_myr) + Number(amount_myr),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await admin.from("client_budgets").insert({
      brand_id,
      company_id: user.company_id,
      current_balance_myr: amount_myr,
      total_topup_myr: amount_myr,
      total_spent_myr: 0,
    });
  }

  return NextResponse.json({ topup });
}
