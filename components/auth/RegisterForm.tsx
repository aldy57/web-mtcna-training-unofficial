"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { StatusPopup } from "@/components/ui/PopupModal";
import {
  registerAction,
  type FormActionState,
} from "@/lib/actions/auth-actions";

export function RegisterForm() {
  const router = useRouter();
  const [state, action, isPending] = useActionState<FormActionState, FormData>(
    registerAction,
    null,
  );
  const [dismissedState, setDismissedState] = useState<FormActionState>(null);

  const isPopupOpen = Boolean(state && state !== dismissedState);

  function handleClosePopup() {
    setDismissedState(state);
    if (state?.ok) {
      router.push(state.data);
      router.refresh();
    }
  }

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Selamat Datang!
        </p>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Buat Akun Baru
        </h1>
        <p className="text-sm text-muted">
          Masukan data di bawah ini untuk membuat akun baru.
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
                htmlFor="register-name"
                className="block text-sm font-medium text-foreground"
              >
                Nama Lengkap
              </label>
              <input
                id="register-name"
                name="fullName"
                type="text"
                required
                autoComplete="name"
                placeholder="Contoh: Budi Santoso"
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted"
              />
              {state && !state.ok && state.fieldErrors?.fullName && (
                <p className="text-xs text-danger-ink">
                  {state.fieldErrors.fullName[0]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="register-email"
                className="block text-sm font-medium text-foreground"
              >
                Alamat Email
              </label>
              <input
                id="register-email"
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
                htmlFor="register-password"
                className="block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <PasswordInput
                id="register-password"
                name="password"
                required
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
              />
              {state && !state.ok && state.fieldErrors?.password && (
                <p className="text-xs text-danger-ink">
                  {state.fieldErrors.password[0]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="register-confirm"
                className="block text-sm font-medium text-foreground"
              >
                Konfirmasi Password
              </label>
              <PasswordInput
                id="register-confirm"
                name="confirmPassword"
                required
                autoComplete="new-password"
                placeholder="Ulangi password"
              />
              {state && !state.ok && state.fieldErrors?.confirmPassword && (
                <p className="text-xs text-danger-ink">
                  {state.fieldErrors.confirmPassword[0]}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <p className="text-sm text-muted">
              Sudah memiliki akun?{" "}
              <Link
                href="/login"
                className="font-semibold text-accent hover:underline"
              >
                Masuk di sini
              </Link>
            </p>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? "Mendaftarkan..." : "Daftar"}
            </Button>
          </div>
        </form>
      </Card>

      {state && (
        <StatusPopup
          isOpen={isPopupOpen}
          status={state.ok ? "success" : "error"}
          title={state.ok ? "Pendaftaran Berhasil" : "Pendaftaran Gagal"}
          message={
            state.ok
              ? "Akun Anda berhasil dibuat. Klik Lanjutkan untuk masuk ke Dashboard."
              : state.error
          }
          buttonLabel={state.ok ? "Lanjutkan" : "Tutup"}
          onClose={handleClosePopup}
        />
      )}
    </div>
  );
}
