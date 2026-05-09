import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface Body {
  agencyName: string;
  fullName: string;
  email: string;
  password: string;
  whatsapp?: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { agencyName, fullName, email, password, whatsapp } = body;
  if (!agencyName || !fullName || !email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password mesti 8 chars minimum" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
  });
  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? "Gagal create user" }, { status: 400 });
  }

  // 2. Create company (agency)
  const prefix = agencyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({ name: agencyName, prefix, is_active: true })
    .select()
    .single();
  if (companyError || !company) {
    // Roll back auth user
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: companyError?.message ?? "Gagal create agensi" }, { status: 400 });
  }

  // 3. Create user profile (BOD = agency owner)
  const { error: userError } = await admin.from("users").insert({
    id: authData.user.id,
    company_id: company.id,
    email,
    full_name: fullName,
    role: "bod",
    whatsapp_number: whatsapp || null,
    is_active: true,
  });
  if (userError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    await admin.from("companies").delete().eq("id", company.id);
    return NextResponse.json({ error: userError.message }, { status: 400 });
  }

  // 4. Create trial subscription (14-day)
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);
  await admin.from("agency_subscriptions").insert({
    company_id: company.id,
    plan: "trial",
    status: "trial",
    monthly_price_myr: 199,
    trial_ends_at: trialEnds.toISOString(),
  });

  return NextResponse.json({
    ok: true,
    company_id: company.id,
    user_id: authData.user.id,
  });
}
