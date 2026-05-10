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

  // Post-Fighter pivot: two roles —
  //   /platform/*       -> platform_admin (us)
  //   /marketer/* + /client/* -> marketer (every regular user)
  // The (agency)/* surface is retired; if a marketer hits it via a stale
  // bookmark, the page-level requireAgencyStaff() guard redirects them
  // to /client/overview. We don't enforce it at the middleware layer
  // anymore (was causing redirect loops).
  const isPlatform = path.startsWith("/platform");
  const isMarketerArea = path.startsWith("/marketer");
  const isClientPortal = path === "/client" || path.startsWith("/client/");
  const isProtected = isPlatform || isMarketerArea || isClientPortal;

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

    // Role gates — only platform admin gets /platform
    if (profile && profile.role !== "platform_admin" && isPlatform) {
      return NextResponse.redirect(new URL("/client/overview", request.url));
    }
  }

  if (user && isAuthPage) {
    // Redirect logged-in users to their portal
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const dest = profile?.role === "platform_admin" ? "/platform" : "/client/overview";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return supabaseResponse;
}
