import assert from "node:assert/strict";
import { describe, it } from "node:test";

function resolveSafeRedirect(nextParam: string | null | undefined): string {
  const isSafeNext =
    Boolean(nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//"));
  return isSafeNext ? (nextParam as string) : "/dashboard";
}

function resolveGoogleUserFullName(
  meta: Record<string, unknown> | null | undefined,
): string {
  if (!meta) return "";
  const fullName = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  const name = typeof meta.name === "string" ? meta.name.trim() : "";
  return fullName || name || "";
}

function resolveAppOrigin(params: {
  requestUrl: string;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  isLocalEnv?: boolean;
}): string {
  const url = new URL(params.requestUrl);
  if (params.isLocalEnv || !params.forwardedHost) {
    return url.origin;
  }
  const proto = params.forwardedProto || "https";
  return `${proto}://${params.forwardedHost}`;
}

function resolveOAuthErrorMessage(
  errorParam: string | null | undefined,
  descriptionParam: string | null | undefined,
): string {
  if (descriptionParam?.trim()) return descriptionParam.trim();
  if (errorParam === "access_denied") return "Masuk dengan Google dibatalkan.";
  if (errorParam) return `Otentikasi Google gagal (${errorParam}).`;
  return "Kode otentikasi Google tidak ditemukan.";
}

function shouldForwardCodeToCallback(
  pathname: string,
  code: string | null | undefined,
): boolean {
  return Boolean(code && pathname !== "/auth/callback");
}

describe("OAuth — Logika Keamanan dan Penanganan Akun Google", () => {
  describe("Pencegahan Open Redirect (resolveSafeRedirect)", () => {
    it("menerima path lokal yang valid", () => {
      assert.equal(resolveSafeRedirect("/dashboard"), "/dashboard");
      assert.equal(resolveSafeRedirect("/belajar/subnetting"), "/belajar/subnetting");
      assert.equal(resolveSafeRedirect("/tryout"), "/tryout");
    });

    it("menolak URL eksternal atau skema ganda dan fallback ke /dashboard", () => {
      assert.equal(resolveSafeRedirect("//evil.com"), "/dashboard");
      assert.equal(resolveSafeRedirect("https://evil.com"), "/dashboard");
      assert.equal(resolveSafeRedirect("javascript:alert(1)"), "/dashboard");
      assert.equal(resolveSafeRedirect(null), "/dashboard");
      assert.equal(resolveSafeRedirect(""), "/dashboard");
    });
  });

  describe("Ekstraksi Nama Pengguna Google (resolveGoogleUserFullName)", () => {
    it("mengekstrak nama dari metadata full_name", () => {
      const meta = { full_name: "Budi Santoso", email: "budi@gmail.com" };
      assert.equal(resolveGoogleUserFullName(meta), "Budi Santoso");
    });

    it("mengekstrak nama dari metadata name (format bawaan Google OAuth)", () => {
      const meta = { name: "Siti Rahma", email: "siti@gmail.com" };
      assert.equal(resolveGoogleUserFullName(meta), "Siti Rahma");
    });

    it("memotong spasi berlebih (trim) dan menangani string kosong", () => {
      const meta = { name: "   ", full_name: "   " };
      assert.equal(resolveGoogleUserFullName(meta), "");
      assert.equal(resolveGoogleUserFullName(null), "");
    });
  });

  describe("Pemetaan Pesan Error OAuth (resolveOAuthErrorMessage)", () => {
    it("menangani pembatalan oleh pengguna (access_denied)", () => {
      const msg = resolveOAuthErrorMessage("access_denied", null);
      assert.equal(msg, "Masuk dengan Google dibatalkan.");
    });

    it("memprioritaskan deskripsi pesan error jika tersedia", () => {
      const msg = resolveOAuthErrorMessage("server_error", "Koneksi Google terputus");
      assert.equal(msg, "Koneksi Google terputus");
    });

    it("menangani kasus kode otentikasi hilang", () => {
      const msg = resolveOAuthErrorMessage(null, null);
      assert.equal(msg, "Kode otentikasi Google tidak ditemukan.");
    });
  });

  describe("Resolusi Host & Origin Production (resolveAppOrigin)", () => {
    it("menggunakan origin lokal saat pada environment development", () => {
      const origin = resolveAppOrigin({
        requestUrl: "http://localhost:3000/auth/callback?code=abc",
        isLocalEnv: true,
      });
      assert.equal(origin, "http://localhost:3000");
    });

    it("mengutamakan x-forwarded-host dan x-forwarded-proto saat di production / Vercel", () => {
      const origin = resolveAppOrigin({
        requestUrl: "http://localhost:3000/auth/callback?code=abc",
        forwardedHost: "mtcna-training.vercel.app",
        forwardedProto: "https",
        isLocalEnv: false,
      });
      assert.equal(origin, "https://mtcna-training.vercel.app");
    });

    it("fallback ke https jika forwardedProto tidak didefinisikan", () => {
      const origin = resolveAppOrigin({
        requestUrl: "http://127.0.0.1:3000/auth/callback",
        forwardedHost: "subdomain.domain.com",
        isLocalEnv: false,
      });
      assert.equal(origin, "https://subdomain.domain.com");
    });
  });

  describe("Pengalihan Otomatis Auth Code (shouldForwardCodeToCallback)", () => {
    it("mendeteksi bahwa /login?code=... harus diteruskan ke /auth/callback", () => {
      assert.equal(shouldForwardCodeToCallback("/login", "oauth_code_123"), true);
      assert.equal(shouldForwardCodeToCallback("/", "oauth_code_123"), true);
    });

    it("tidak mengalihkan bila sudah berada di /auth/callback", () => {
      assert.equal(
        shouldForwardCodeToCallback("/auth/callback", "oauth_code_123"),
        false,
      );
    });

    it("tidak mengalihkan bila parameter code tidak ada", () => {
      assert.equal(shouldForwardCodeToCallback("/login", null), false);
      assert.equal(shouldForwardCodeToCallback("/login", undefined), false);
    });
  });
});

