import { NextResponse } from "next/server";
import { requireAgencyLeadership } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

function generateTempPassword(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += charset[Math.floor(Math.random() * charset.length)];
  }
  return out;
}

export async function POST(req: Request) {
  const inviter = await requireAgencyLeadership();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { brand_id, email, full_name } = body;
  if (!brand_id || !email || !full_name) {
    return NextResponse.json({ error: "brand_id, email, full_name required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify brand belongs to caller's company
  const { data: brand } = await admin
    .from("brands")
    .select("id, company_id, assigned_client_user_id")
    .eq("id", brand_id)
    .eq("company_id", inviter.company_id)
    .maybeSingle();
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  if (brand.assigned_client_user_id) {
    return NextResponse.json({ error: "Brand already has an assigned client user" }, { status: 400 });
  }

  const tempPassword = generateTempPassword();

  // Create auth user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: email.toLowerCase(),
    password: tempPassword,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message || "Failed to create user" }, { status: 500 });
  }

  // Create user profile with role=client
  const { error: profileErr } = await admin.from("users").insert({
    id: created.user.id,
    company_id: inviter.company_id,
    email: email.toLowerCase(),
    full_name,
    role: "client",
    is_active: true,
  });

  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  // Assign brand to this user
  const { error: assignErr } = await admin
    .from("brands")
    .update({ assigned_client_user_id: created.user.id })
    .eq("id", brand_id);

  if (assignErr) {
    return NextResponse.json({ error: assignErr.message }, { status: 500 });
  }

  return NextResponse.json({
    user_id: created.user.id,
    email,
    temp_password: tempPassword,
  });
}
