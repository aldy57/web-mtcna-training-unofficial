"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { StatusPopup } from "@/components/ui/PopupModal";
import {
  changeOwnPasswordAction,
  updateProfileNameAction,
  type FormActionState,
} from "@/lib/actions/auth-actions";
import type { UserProfile } from "@/lib/types";

export function AccountSettingsForms({ user }: { user: UserProfile }) {
  const [nameState, nameAction, isNamePending] = useActionState<
    FormActionState,
    FormData
  >(updateProfileNameAction, null);
  const [dismissedNameState, setDismissedNameState] =
    useState<FormActionState>(null);

  const [pwdState, pwdAction, isPwdPending] = useActionState<
    FormActionState,
    FormData
  >(changeOwnPasswordAction, null);
  const [dismissedPwdState, setDismissedPwdState] =
    useState<FormActionState>(null);

  const isNamePopupOpen = Boolean(nameState && nameState !== dismissedNameState);
  const isPwdPopupOpen = Boolean(pwdState && pwdState !== dismissedPwdState);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Profil Akun
            </h2>
            <p className="text-xs text-muted">
              Perbarui nama tampilan pada dashboard dan laporan hasil.
            </p>
          </div>
          <Badge variant={user.role === "admin" ? "accent" : "neutral"}>
            {user.role === "admin" ? "Admin" : "Peserta"}
          </Badge>
        </div>

        {nameState && (
          <Notice variant={nameState.ok ? "success" : "danger"}>
            <p>{nameState.ok ? nameState.data : nameState.error}</p>
          </Notice>
        )}

        <form action={nameAction} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="account-email"
              className="block text-sm font-medium text-muted"
            >
              Email Terdaftar
            </label>
            <input
              id="account-email"
              type="email"
              value={user.email}
              disabled
              className="w-full rounded-xl border border-border bg-surface-soft px-3.5 py-2.5 text-sm text-muted"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="account-fullname"
              className="block text-sm font-medium text-foreground"
            >
              Nama Lengkap
            </label>
            <input
              id="account-fullname"
              name="fullName"
              type="text"
              required
              defaultValue={user.fullName}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground"
            />
            {nameState && !nameState.ok && nameState.fieldErrors?.fullName && (
              <p className="text-xs text-danger-ink">
                {nameState.fieldErrors.fullName[0]}
              </p>
            )}
          </div>

          <Button type="submit" variant="primary" disabled={isNamePending}>
            {isNamePending ? "Menyimpan..." : "Simpan Nama"}
          </Button>
        </form>
      </Card>

      <Card className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Ganti Password Akun
          </h2>
          <p className="text-xs text-muted">
            Perbarui password akun Anda di sini.
          </p>
        </div>

        {pwdState && (
          <Notice variant={pwdState.ok ? "success" : "danger"}>
            <p>{pwdState.ok ? pwdState.data : pwdState.error}</p>
          </Notice>
        )}

        <form action={pwdAction} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-foreground"
            >
              Password Baru
            </label>
            <PasswordInput
              id="new-password"
              name="newPassword"
              required
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
            />
            {pwdState && !pwdState.ok && pwdState.fieldErrors?.newPassword && (
              <p className="text-xs text-danger-ink">
                {pwdState.fieldErrors.newPassword[0]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-foreground"
            >
              Konfirmasi Password Baru
            </label>
            <PasswordInput
              id="confirm-password"
              name="confirmPassword"
              required
              autoComplete="new-password"
              placeholder="Ulangi password baru"
            />
            {pwdState &&
              !pwdState.ok &&
              pwdState.fieldErrors?.confirmPassword && (
                <p className="text-xs text-danger-ink">
                  {pwdState.fieldErrors.confirmPassword[0]}
                </p>
              )}
          </div>

          <Button type="submit" variant="primary" disabled={isPwdPending}>
            {isPwdPending ? "Memperbarui..." : "Ganti Password"}
          </Button>
        </form>
      </Card>

      {nameState && (
        <StatusPopup
          isOpen={isNamePopupOpen}
          status={nameState.ok ? "success" : "error"}
          title={
            nameState.ok
              ? "Profil Berhasil Diperbarui"
              : "Gagal Memperbarui Profil"
          }
          message={nameState.ok ? nameState.data : nameState.error}
          onClose={() => setDismissedNameState(nameState)}
        />
      )}

      {pwdState && (
        <StatusPopup
          isOpen={isPwdPopupOpen}
          status={pwdState.ok ? "success" : "error"}
          title={
            pwdState.ok
              ? "Password Berhasil Diperbarui"
              : "Gagal Mengubah Password"
          }
          message={pwdState.ok ? pwdState.data : pwdState.error}
          onClose={() => setDismissedPwdState(pwdState)}
        />
      )}
    </div>
  );
}
