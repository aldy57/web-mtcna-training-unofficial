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
  updateProfileAction,
  type FormActionState,
} from "@/lib/actions/auth-actions";
import type { UserProfile } from "@/lib/types";

export function AccountSettingsForms({ user }: { user: UserProfile }) {
  const [profileState, profileAction, isProfilePending] = useActionState<
    FormActionState,
    FormData
  >(updateProfileAction, null);
  const [dismissedProfileState, setDismissedProfileState] =
    useState<FormActionState>(null);

  const [pwdState, pwdAction, isPwdPending] = useActionState<
    FormActionState,
    FormData
  >(changeOwnPasswordAction, null);
  const [dismissedPwdState, setDismissedPwdState] =
    useState<FormActionState>(null);

  const isProfilePopupOpen = Boolean(
    profileState && profileState !== dismissedProfileState,
  );
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
              Perbarui nama tampilan dan alamat email akun Anda.
            </p>
          </div>
          <Badge variant={user.role === "admin" ? "accent" : "neutral"}>
            {user.role === "admin" ? "Admin" : "Peserta"}
          </Badge>
        </div>

        {profileState && (
          <Notice variant={profileState.ok ? "success" : "danger"}>
            <p>{profileState.ok ? profileState.data : profileState.error}</p>
          </Notice>
        )}

        <form action={profileAction} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="account-email"
              className="block text-sm font-medium text-foreground"
            >
              Alamat Email
            </label>
            <input
              id="account-email"
              name="email"
              type="email"
              required
              defaultValue={user.email}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
            />
            {profileState &&
              !profileState.ok &&
              profileState.fieldErrors?.email && (
                <p className="text-xs text-danger-ink">
                  {profileState.fieldErrors.email[0]}
                </p>
              )}
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
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
            />
            {profileState &&
              !profileState.ok &&
              profileState.fieldErrors?.fullName && (
                <p className="text-xs text-danger-ink">
                  {profileState.fieldErrors.fullName[0]}
                </p>
              )}
          </div>

          <Button type="submit" variant="primary" disabled={isProfilePending}>
            {isProfilePending ? "Menyimpan..." : "Simpan Perubahan"}
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

      {profileState && (
        <StatusPopup
          isOpen={isProfilePopupOpen}
          status={profileState.ok ? "success" : "error"}
          title={
            profileState.ok
              ? "Profil Berhasil Diperbarui"
              : "Gagal Memperbarui Profil"
          }
          message={profileState.ok ? profileState.data : profileState.error}
          onClose={() => setDismissedProfileState(profileState)}
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
