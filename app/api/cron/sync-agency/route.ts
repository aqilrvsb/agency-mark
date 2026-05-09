import { NextResponse } from "next/server";
import { syncAgency } from "@/lib/zernio/sync";

/**
 * Manual sync trigger for a single agency. Used by master admin "Sync now" button.
 * Protected by CRON_SECRET (passed from server-side server action).
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const companyId = body.company_id as string | undefined;
  if (!companyId) {
    return NextResponse.json({ error: "company_id required" }, { status: 400 });
  }

  const result = await syncAgency(companyId);
  return NextResponse.json(result);
}
