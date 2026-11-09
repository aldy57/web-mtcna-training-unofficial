import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv, hasSupabasePublicEnv } from "@/lib/env";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/belajar",
  "/tryout",
  "/akun",
  "/admin",
  "/panduan",
] as const;

const AUTH_ROUTES = ["/login", "/register"] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route);
}

export async function updateSupabaseSession(
  request: NextRequest,
): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const { pathname } = request.nextUrl;

  // Tangani kasus saat Supabase mengembalikan auth code ke /login (misal karena Site URL diatur ke /login)
  // Otomatis alihkan kode tersebut ke route handler /auth/callback agar sesi berhasil ditukar dan disimpan
  if (code && pathname !== "/auth/callback") {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  if (!hasSupabasePublicEnv()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthRoute(pathname)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

