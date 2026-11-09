import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorParam = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const nextParam = requestUrl.searchParams.get("next");

  // Tentukan origin yang tepat (mendukung reverse proxy / load balancer Vercel di production)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const isLocalEnv = process.env.NODE_ENV === "development";
  const appOrigin =
    isLocalEnv || !forwardedHost
      ? requestUrl.origin
      : `${forwardedProto}://${forwardedHost}`;

  // Validasi pengalihan agar hanya mengarah ke rute internal lokal
  const isSafeNext =
    Boolean(nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//"));
  const defaultNext = "/dashboard";

  // Tangani jika Google atau Supabase mengembalikan parameter error (misal pembatalan oleh pengguna)
  if (errorParam) {
    const message =
      errorDescription ||
      (errorParam === "access_denied"
        ? "Masuk dengan Google dibatalkan."
        : `Otentikasi Google gagal (${errorParam}).`);
    return NextResponse.redirect(
      `${appOrigin}/login?error=${encodeURIComponent(message)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${appOrigin}/login?error=${encodeURIComponent("Kode otentikasi Google tidak ditemukan.")}`,
    );
  }

  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();
    const cookieStore = await cookies();

    // Buffer untuk menyimpan semua cookie yang diset oleh Supabase selama code exchange
    // Ini penting karena NextResponse.redirect membuat objek respons baru
    // yang harus ditempeli Set-Cookie secara eksplisit agar tersimpan di browser.
    const cookiesToSetBuffer: Array<{
      name: string;
      value: string;
      options: Parameters<typeof cookieStore.set>[2];
    }> = [];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
            cookiesToSetBuffer.push({ name, value, options });
          }
        },
      },
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      const message =
        error?.message || "Gagal memvalidasi sesi otentikasi Google.";
      return NextResponse.redirect(
        `${appOrigin}/login?error=${encodeURIComponent(message)}`,
      );
    }

    // Periksa peran akun di tabel profiles untuk pengalihan cerdas
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle<{ role: "admin" | "user" }>();

    // Jika pengguna adalah admin dan tidak ada rute spesifik yang diminta, arahkan ke /admin
    const destination =
      !isSafeNext && profile?.role === "admin"
        ? "/admin"
        : isSafeNext
          ? (nextParam as string)
          : defaultNext;

    const redirectResponse = NextResponse.redirect(
      `${appOrigin}${destination}`,
    );

    // Tempelkan seluruh cookie sesi ke header respons redirect
    for (const { name, value, options } of cookiesToSetBuffer) {
      redirectResponse.cookies.set(name, value, options);
    }

    return redirectResponse;
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Terjadi kesalahan internal saat memproses otentikasi Google.";
    return NextResponse.redirect(
      `${appOrigin}/login?error=${encodeURIComponent(message)}`,
    );
  }
}
