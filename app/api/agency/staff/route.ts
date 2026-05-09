import { NextResponse } from "next/server";
import { requireAgencyLeadership } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

function generateTempPassword(): string {
  // Reasonably random 12-char password
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

  const { email, full_name, role, whatsapp_number } = body;
  if (!email || !full_name || !role) {
    return NextResponse.json({ error: "email, full_name, role required" }, { status: 400 });
  }
  if (!["leader", "marketer"].includes(role)) {
    return NextResponse.json({ error: "Role must be leader or marketer" }, { status: 400 });
  }

  // BOD invites Leader/Marketer; Leader can invite Marketer; platform_admin can invite anyone
  if (inviter.role === "leader" && role !== "marketer") {
    return NextResponse.json({ error: "Leaders can only invite marketers" }, { status: 403 });
  }

  const admin = createAdminClient();
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

  // Create user profile in public.users
  const { error: profileErr } = await admin.from("users").insert({
    id: created.user.id,
    company_id: inviter.company_id,
    email: email.toLowerCase(),
    full_name,
    role,
    leader_id: inviter.role === "leader" ? inviter.id : null,
    whatsapp_number: whatsapp_number ?? null,
    is_active: true,
  });

  if (profileErr) {
    // Roll back auth user if profile insert fails
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({
    user_id: created.user.id,
    email,
    temp_password: tempPassword,
  });
}
