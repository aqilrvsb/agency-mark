import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/login" || path === "/register" || path === "/forgot-password";

  // Three protected portals + role mapping:
  //   /platform/*  -> platform_admin (master admin)
  //   /dashboard/* -> bod, leader, marketer (agency staff)
  //   /client/*    -> client (agency's client)
  const isPlatform = path.startsWith("/platform");
  const isAgencyDash = path.startsWith("/dashboard") || path.startsWith("/clients") ||
                       path.startsWith("/campaigns") || path.startsWith("/analytics") ||
                       path.startsWith("/staff") || path.startsWith("/invoices") ||
                       path.startsWith("/settings");
  const isClientPortal = path.startsWith("/client");
  const isProtected = isPlatform || isAgencyDash || isClientPortal;

  if (!user && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isProtected) {
    const { data: profile } = await supabase
      .from("users")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      const url = new URL("/login", request.url);
      url.searchParams.set("error", "account_deactivated");
      return NextResponse.redirect(url);
    }

    // Role-based access enforcement
    if (profile) {
      // Platform admin can access everything
      if (profile.role === "platform_admin") {
        // Allow all — they own the system
      } else if (isPlatform) {
        // Non-platform users blocked from /platform
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } else if (isClientPortal && profile.role !== "client") {
        // Only clients access /client
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } else if (isAgencyDash && profile.role === "client") {
        // Clients can't access agency dashboard
        return NextResponse.redirect(new URL("/client/overview", request.url));
      }
    }
  }

  if (user && isAuthPage) {
    // Redirect logged-in users to their portal
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const dest =
      profile?.role === "platform_admin" ? "/platform" :
      profile?.role === "client" ? "/client/overview" :
      "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return supabaseResponse;
}
