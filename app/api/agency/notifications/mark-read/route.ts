import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { id, kind } = body;
  if (!id || !kind) return NextResponse.json({ error: "id, kind required" }, { status: 400 });

  const admin = createAdminClient();

  if (kind === "notification") {
    const { error } = await admin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (kind === "alert") {
    if (!user.company_id) return NextResponse.json({ error: "No company" }, { status: 400 });
    const { error } = await admin
      .from("alert_history")
      .update({ is_read: true })
      .eq("id", id)
      .eq("company_id", user.company_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
