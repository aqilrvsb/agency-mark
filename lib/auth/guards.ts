import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "platform_admin" | "bod" | "leader" | "marketer" | "client";

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
 * React cache() dedupes calls within a single request — if a page
 * calls requireAgencyStaff() and a child component also needs the
 * user, only one Supabase round-trip is made.
 */
export const getCurrentUser = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    if (user.role === "client") redirect("/client/overview");
    redirect("/dashboard");
  }
  return user;
}

export const requirePlatformAdmin = () => requireRole(["platform_admin"]);
export const requireClient = () => requireRole(["platform_admin", "client"]);

export interface AgencyUserProfile extends UserProfile {
  company_id: string;
}

async function requireAgencyWithCompany(allowed: UserRole[]): Promise<AgencyUserProfile> {
  const user = await requireRole(allowed);
  if (!user.company_id) {
    if (user.role === "platform_admin") redirect("/platform");
    redirect("/login?error=no_company");
  }
  return user as AgencyUserProfile;
}

export const requireAgencyStaff = () =>
  requireAgencyWithCompany(["platform_admin", "bod", "leader", "marketer"]);
export const requireAgencyLeadership = () =>
  requireAgencyWithCompany(["platform_admin", "bod", "leader"]);
