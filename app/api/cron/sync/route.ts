import { NextResponse } from "next/server";
import { syncAllAgencies } from "@/lib/zernio/sync";

/**
 * Hourly cron endpoint. Vercel Cron or external scheduler hits this.
 * Protected by CRON_SECRET (Authorization: Bearer <secret>).
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncAllAgencies();
  return NextResponse.json(result);
}

// Vercel Cron also calls via GET — accept both
export async function GET(req: Request) {
  return POST(req);
}
