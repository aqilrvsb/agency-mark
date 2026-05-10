import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Role enum after the Fighter pivot:
 *  - platform_admin: us (the AdSolution operators)
 *  - marketer: every regular user. Each marketer owns their own
 *    company + brand row (auto-provisioned at signup) and connects
 *    their own Meta/TikTok/Google ad accounts directly.
 *
 * Legacy values ('bod'|'leader'|'client') are kept in the type union
 * — but NOT in the DB CHECK constraint — so the still-present
 * /(agency)/* page files (which we're not deleting in the pivot
 * commit, just redirecting away from) continue to compile without
 * widespread edits. They render code paths that are unreachable in
 * practice because requireAgencyStaff redirects non-admins away.
 */
export type UserRole = "platform_admin" | "marketer" | "bod" | "leader" | "client";

export interface UserProfile {
  id: string;
  company_id: string | null;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  leader_id: string | null;
}

/**
 * Get current authenticated user + profile.
 * React cache() dedupes calls within a single request.
 */
export const getCurrentUser = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id, email, full_name, role, is_active, leader_id")
    .eq("id", user.id)
    .maybeSingle();

  return (profile as UserProfile) ?? null;
});

/**
 * Require auth + specific roles. Redirects if not authorized.
 */
export async function requireRole(allowed: UserRole[]): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.is_active) redirect("/login?error=account_deactivated");
  if (!allowed.includes(user.role)) {
    if (user.role === "platform_admin") redirect("/platform");
    redirect("/marketer/overview");
  }
  return user;
}

export const requirePlatformAdmin = () => requireRole(["platform_admin"]);

export interface MarketerUserProfile extends UserProfile {
  company_id: string;
}

/**
 * Require a marketer (the Fighter persona). Platform admins can also
 * access marketer routes for support / debugging purposes.
 */
export async function requireMarketer(): Promise<MarketerUserProfile> {
  const user = await requireRole(["platform_admin", "marketer"]);
  if (!user.company_id) {
    if (user.role === "platform_admin") redirect("/platform");
    redirect("/login?error=no_workspace");
  }
  return user as MarketerUserProfile;
}

// ─── Legacy aliases ────────────────────────────────────────────────
// Kept so existing /(client)/* routes still compile and serve the
// brand-scoped UX (which IS the marketer dashboard now).
export const requireClient = requireMarketer;

/**
 * The agency-surface routes (under /(agency)/*) are retired post-Fighter
 * pivot. We don't delete the files in this commit (lower-risk), but we
 * actively redirect non-admin visitors to /client/overview so a curious
 * marketer hitting /dashboard or /clients lands on their actual data.
 *
 * Platform admins still pass through for support / debugging.
 */
export async function requireAgencyStaff(): Promise<MarketerUserProfile> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.is_active) redirect("/login?error=account_deactivated");
  if (user.role !== "platform_admin") redirect("/client/overview");
  if (!user.company_id) redirect("/platform");
  return user as MarketerUserProfile;
}
export const requireAgencyLeadership = requireAgencyStaff;
export type AgencyUserProfile = MarketerUserProfile;
