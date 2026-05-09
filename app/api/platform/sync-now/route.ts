import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { syncAgency } from "@/lib/zernio/sync";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "platform_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.company_id) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await syncAgency(body.company_id);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
