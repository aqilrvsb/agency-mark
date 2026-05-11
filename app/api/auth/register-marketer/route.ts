import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { seedDefaultTemplates } from "@/lib/templates/seed-defaults";
import { getPeningads, emailTag } from "@/lib/peningads/client";

interface Body {
  fullName: string;
  email: string;
  password: string;
  whatsapp?: string;
}

/**
 * Single-step Marketer ("Fighter") registration.
 *
 * Creates: auth user → companies row (their personal workspace) →
 * users row (role='marketer') → brands row (1:1 with the marketer) →
 * default report templates seeded.
 *
 * No agency / role picker — every signup is a marketer.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { fullName, email, password, whatsapp } = body;
  if (!fullName || !email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password mesti 8 chars minimum" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Create auth user (auto-confirm, no email verification needed)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? "Gagal create user" }, { status: 400 });
  }
  const userId = authData.user.id;

  const rollback = async () => {
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch {}
  };

  // 2. Create the marketer's personal workspace (companies row).
  // owner_user_id intentionally null at this step — we'll update it
  // once the users row exists, since owner_user_id FK-references
  // public.users (which doesn't get the row until step 3).
  const workspaceName = `${fullName}'s Workspace`;
  const prefix = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) + "-" + userId.slice(0, 6);

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      name: workspaceName,
      prefix,
      is_active: true,
    })
    .select()
    .single();
  if (companyError || !company) {
    await rollback();
    return NextResponse.json({ error: companyError?.message ?? "Gagal create workspace" }, { status: 400 });
  }

  // 3. Create user profile (role='marketer'). Now that public.users has
  // a row, we can wire owner_user_id back to companies in step 4.
  const { error: userError } = await admin.from("users").insert({
    id: userId,
    company_id: company.id,
    email,
    full_name: fullName,
    role: "marketer",
    whatsapp_number: whatsapp || null,
    is_active: true,
  });
  if (userError) {
    await admin.from("companies").delete().eq("id", company.id);
    await rollback();
    return NextResponse.json({ error: userError.message }, { status: 400 });
  }

  // 3b. Backfill the workspace's owner_user_id now that the FK target
  // exists. Non-fatal if it fails — rerunnable.
  await admin.from("companies").update({ owner_user_id: userId }).eq("id", company.id);

  // 4a. Find or create a Peningads profile, scoped by the fighter's email
  // so re-registrations with the same email reuse the existing profile
  // (avoids the "Aqil Fighter Test (AdSolution)" duplicates the user
  // pointed out). The lookup uses an embedded `[fighter:<email>]` tag
  // in the Peningads profile description.
  let peningadsProfileId: string | null = null;
  try {
    const peningads = getPeningads();
    const existing = await peningads.findProfileByEmail(email);
    if (existing) {
      peningadsProfileId = existing._id;
    } else {
      const created = await peningads.createProfile({
        name: `${fullName} (AdSolution)`,
        description: `${emailTag(email)} Auto-created for AdSolution marketer ${userId}`,
      });
      peningadsProfileId = created._id;
    }
  } catch (e) {
    // Non-fatal — the connect flow can lazily create one later if this
    // fails (network blip, Peningads outage, paywall on free plan, etc.)
    console.error("[register-marketer] peningads profile lookup/create failed:", (e as Error).message);
  }

  // 4b. Auto-create the marketer's default brand (1:1 with the user)
  const { data: brand, error: brandError } = await admin
    .from("brands")
    .insert({
      company_id: company.id,
      name: fullName,
      is_active: true,
      owner_user_id: userId,
      assigned_client_user_id: userId, // marketer IS their own client for /client/* routes
      peningads_profile_id: peningadsProfileId,
    })
    .select()
    .single();
  if (brandError || !brand) {
    // Non-fatal — proceed but log
    console.error("[register-marketer] brand creation failed:", brandError?.message);
  }

  // 5. Seed default report templates
  await seedDefaultTemplates(admin, userId, company.id, brand?.id ?? null);

  return NextResponse.json({
    ok: true,
    company_id: company.id,
    brand_id: brand?.id ?? null,
    user_id: userId,
  });
}
