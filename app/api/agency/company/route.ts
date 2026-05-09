import { NextResponse } from "next/server";
import { requireAgencyLeadership } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: Request) {
  const user = await requireAgencyLeadership();
  // Only BOD or platform_admin can edit company
  if (user.role !== "bod" && user.role !== "platform_admin") {
    return NextResponse.json({ error: "Only BOD or platform admin can edit agency profile" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, logo_url } = body;
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("companies")
    .update({
      name: name.trim(),
      logo_url: logo_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.company_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
