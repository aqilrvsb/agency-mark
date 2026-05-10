import { NextResponse } from "next/server";
import { runAnomalyCheck } from "@/lib/alerts/anomaly-check";

/**
 * Nightly anomaly detector. Scans every active brand's last-24h
 * spend / ROAS / CPA against trailing 7-day baseline; writes
 * alert_history + fans out notifications to BOD/Leader users.
 *
 * Schedule via vercel.json crons (e.g. "0 1 * * *" = daily at 1 AM UTC
 * = 9 AM Malaysia). Auth: Authorization: Bearer ${CRON_SECRET}.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runAnomalyCheck();
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  return POST(req);
}
