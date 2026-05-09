import { NextResponse } from "next/server";
import { requireAgencyLeadership } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const user = await requireAgencyLeadership();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { brand_id, platform, external_account_id, external_account_name } = body;
  if (!brand_id || !platform || !external_account_id) {
    return NextResponse.json({ error: "brand_id, platform, external_account_id required" }, { status: 400 });
  }
  if (!["meta", "tiktok", "meta_ads", "tiktok_ads", "meta_insights", "google_ads"].includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify brand belongs to caller's company
  const { data: brand } = await supabase
    .from("brands")
    .select("id, company_id")
    .eq("id", brand_id)
    .eq("company_id", user.company_id)
    .maybeSingle();
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("brand_ad_accounts")
    .insert({
      brand_id,
      company_id: user.company_id,
      platform,
      external_account_id,
      external_account_name: external_account_name ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ad_account: data });
}

export async function DELETE(req: Request) {
  const user = await requireAgencyLeadership();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("brand_ad_accounts")
    .delete()
    .eq("id", id)
    .eq("company_id", user.company_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
