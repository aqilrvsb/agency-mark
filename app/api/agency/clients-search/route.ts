import { NextResponse } from "next/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

/**
 * Client search for the agency top-bar typeahead.
 * Returns up to 8 brands matching `q` ordered by name.
 * Scoped to caller's company via RLS.
 */
export async function GET(req: Request) {
  const user = await requireAgencyStaff();
  if (!user.company_id) return NextResponse.json({ brands: [] });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  const supabase = await createClient();
  let query = supabase
    .from("brands")
    .select("id, name, contact_email, is_active")
    .eq("company_id", user.company_id)
    .order("name")
    .limit(8);

  if (q.length > 0) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data } = await query;
  return NextResponse.json({
    brands: (data ?? []).map((b) => ({
      id: b.id as string,
      name: b.name as string,
      email: (b.contact_email as string) ?? null,
      is_active: b.is_active as boolean,
    })),
  });
}
