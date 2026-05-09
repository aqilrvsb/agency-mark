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
 * Returns null if not signed in.
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id, email, full_name, role, is_active, leader_id")
    .eq("id", user.id)
    .maybeSingle();

  return (profile as UserProfile) ?? null;
}

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
export const requireAgencyStaff = () => requireRole(["platform_admin", "bod", "leader", "marketer"]);
export const requireAgencyLeadership = () => requireRole(["platform_admin", "bod", "leader"]);
export const requireClient = () => requireRole(["platform_admin", "client"]);
