import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "platform_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.company_id) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("adzviser_connections")
    .upsert(
      {
        company_id: body.company_id,
        api_key: body.api_key,
        workspace_id: body.workspace_id,
        notes: body.notes,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
