"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { StatusPopup } from "@/components/ui/PopupModal";
import { loginAction, type FormActionState } from "@/lib/actions/auth-actions";
import { showToast } from "@/lib/toast";

export function LoginForm() {
  const router = useRouter();
  const [state, action, isPending] = useActionState<FormActionState, FormData>(
    loginAction,
    null,
  );
  const [dismissedState, setDismissedState] = useState<FormActionState>(null);
  const hasRedirectedRef = useRef(false);

  const isRedirecting = Boolean(state?.ok);
  const isErrorPopupOpen = Boolean(
    state && !state.ok && state !== dismissedState,
  );

  useEffect(() => {
    if (state?.ok && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      const toastPayload = {
        type: "success" as const,
        title: "Login Berhasil!",
        message: "Selamat datang di platform MIRA MTCNA Training.",
        duration: 5000,
      };

      // Tampilkan notifikasi toast langsung di container toast
      showToast(toastPayload);

      router.push(state.data);
      router.refresh();
    }
  }, [state, router]);

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
        {state && !state.ok && (
          <Notice variant="danger">
            <p>{state.error}</p>
          </Notice>
        )}

        <form action={action} className="space-y-4" noValidate>
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
