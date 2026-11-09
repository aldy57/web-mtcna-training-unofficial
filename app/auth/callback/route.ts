import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const nextParam = searchParams.get("next");

  // Validasi pengalihan agar hanya mengarah ke rute internal lokal
  const isSafeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//");
  const defaultNext = "/dashboard";

  // Tangani jika Google atau Supabase mengembalikan parameter error (misal pembatalan oleh pengguna)
  if (errorParam) {
    const message =
      errorDescription ||
      (errorParam === "access_denied"
        ? "Masuk dengan Google dibatalkan."
        : `Otentikasi Google gagal (${errorParam}).`);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Kode otentikasi Google tidak ditemukan.")}`,
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      const message =
        error?.message || "Gagal memvalidasi sesi otentikasi Google.";
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(message)}`,
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
          ? nextParam
          : defaultNext;

    return NextResponse.redirect(`${origin}${destination}`);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Terjadi kesalahan internal saat memproses otentikasi Google.";
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`,
    );
  }
}

