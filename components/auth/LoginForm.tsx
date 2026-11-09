"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { StatusPopup } from "@/components/ui/PopupModal";
import { loginAction, type FormActionState } from "@/lib/actions/auth-actions";
import { showToast } from "@/lib/toast";
import type { AppBrandingSettings } from "@/lib/types";

export interface LoginFormProps {
  branding?: AppBrandingSettings;
  initialError?: string;
  nextUrl?: string;
}

export function LoginForm({
  branding,
  initialError,
  nextUrl,
}: LoginFormProps = {}) {
  const router = useRouter();
  const oauthError = initialError || null;
  const [state, action, isPending] = useActionState<FormActionState, FormData>(
    loginAction,
    null,
  );
  const [dismissedState, setDismissedState] = useState<FormActionState>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const hasRedirectedRef = useRef(false);

  // Hanya tampilkan layar loading jika form benar-benar disubmit oleh pengguna pada sesi saat ini
  const isRedirecting = Boolean(hasSubmitted && state?.ok);
  const isErrorPopupOpen = Boolean(
    state && !state.ok && state !== dismissedState,
  );

  // Efek pengalihan setelah login berhasil
  useEffect(() => {
    if (hasSubmitted && state?.ok && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;

      const toastPayload = {
        type: "success" as const,
        title: "Login Berhasil!",
        message: `Selamat datang di ${branding?.appName || "platform pembelajaran jaringan"}.`,
        duration: 5000,
      };

      // Tampilkan notifikasi toast langsung di container toast
      showToast(toastPayload);

      router.replace(state.data);
      router.refresh();
    }
  }, [hasSubmitted, state, router, branding?.appName]);

  // Safety net timeout: jika terjadi gangguan jaringan atau pengalihan tertahan lebih dari 10 detik,
  // kembalikan kontrol ke form login agar pengguna tidak terjebak
  useEffect(() => {
    if (!isRedirecting) return;

    const safetyTimer = setTimeout(() => {
      setHasSubmitted(false);
      hasRedirectedRef.current = false;
    }, 10000);

    return () => clearTimeout(safetyTimer);
  }, [isRedirecting]);

  function handleFormSubmit() {
    setHasSubmitted(true);
    hasRedirectedRef.current = false;
  }

  // Tampilan loading layar penuh (fullscreen overlay) ala Figma
  if (isRedirecting) {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background select-none animate-in fade-in duration-200"
        role="status"
        aria-live="polite"
        aria-label="Menyiapkan dashboard"
      >
        <div className="flex flex-col items-center space-y-4">
          {/* Logo dengan Teks Aplikasi */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              branding?.logoWithTextUrl ||
              branding?.logoUrl ||
              "/network-router-logo-text.svg"
            }
            alt={branding?.appName || "Logo"}
            className="h-8.5 w-auto object-contain opacity-90"
          />

          {/* Progress Bar Ramping Khas Figma */}
          <div
            className="relative h-1 w-52 overflow-hidden rounded-full bg-surface-soft border border-border/60"
            role="progressbar"
            aria-label="Menyiapkan dashboard"
          >
            <div className="absolute top-0 bottom-0 left-0 w-1/3 rounded-full bg-accent animate-indeterminate-progress" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Selamat Datang Kembali!
        </p>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Masuk ke Akun Anda
        </h1>
        <p className="text-sm text-muted">
          Masuk untuk mulai sesi belajar, tryout, dan melihat riwayat
          nilai.
        </p>
      </div>

      <Card className="w-full space-y-6">
        {((state && !state.ok) || oauthError) && (
          <Notice variant="danger">
            <p>{state && !state.ok ? state.error : oauthError}</p>
          </Notice>
        )}

        {/* Tombol Masuk dengan Google */}
        <div className="space-y-4">
          <GoogleSignInButton label="Masuk dengan Google" nextUrl={nextUrl} />

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-surface px-3 text-xs font-medium text-muted">
              atau masuk dengan email
            </span>
          </div>
        </div>

        <form action={action} onSubmit={handleFormSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-foreground"
              >
                Alamat Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="nama@contoh.com"
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted"
              />
              {state && !state.ok && state.fieldErrors?.email && (
                <p className="text-xs text-danger-ink">
                  {state.fieldErrors.email[0]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <PasswordInput
                id="login-password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="Masukkan password"
              />
              {state && !state.ok && state.fieldErrors?.password && (
                <p className="text-xs text-danger-ink">
                  {state.fieldErrors.password[0]}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <p className="text-sm text-muted">
              Belum memiliki akun?{" "}
              <Link
                href="/register"
                className="font-semibold text-accent hover:underline"
              >
                Daftar sekarang
              </Link>
            </p>
            <Button
              type="submit"
              variant="primary"
              disabled={isPending || isRedirecting}
            >
              {isRedirecting
                ? "Mengalihkan ke dashboard..."
                : isPending
                  ? "Memproses..."
                  : "Masuk"}
            </Button>
          </div>
        </form>
      </Card>

      {state && !state.ok && (
        <StatusPopup
          isOpen={isErrorPopupOpen}
          status="error"
          title="Gagal Masuk"
          message={state.error}
          buttonLabel="Tutup"
          onClose={() => setDismissedState(state)}
        />
      )}
    </div>
  );
}
