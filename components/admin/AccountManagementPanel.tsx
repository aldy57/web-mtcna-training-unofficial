"use client";

import { useActionState, useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { ConfirmDialog, StatusPopup } from "@/components/ui/PopupModal";
import {
  createAccountByAdminAction,
  deleteParticipantAccountAction,
  resetParticipantPasswordAction,
  type AdminFormState,
} from "@/lib/actions/admin-actions";
import type { UserProfile } from "@/lib/types";

export function AccountManagementPanel({
  users,
}: {
  users: readonly UserProfile[];
}) {
  const [createState, createAction, isCreating] = useActionState<
    AdminFormState,
    FormData
  >(createAccountByAdminAction, null);
  const [dismissedCreateState, setDismissedCreateState] =
    useState<AdminFormState>(null);

  const [selectedRole, setSelectedRole] = useState<"user" | "admin">("user");
  const [resetTarget, setResetTarget] = useState<UserProfile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    title: string;
    message: string;
  } | null>(null);
  const [isMutating, startTransition] = useTransition();

  const isCreatePopupOpen = Boolean(
    createState && createState !== dismissedCreateState,
  );

  function handleResetPasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetTarget) {
      return;
    }
    const formData = new FormData();
    formData.set("targetUserId", resetTarget.id);
    formData.set("newPassword", newPasswordInput);

    startTransition(async () => {
      const result = await resetParticipantPasswordAction(formData);
      setFeedback({
        ok: result.ok,
        title: result.ok
          ? "Password Peserta Diperbarui"
          : "Gagal Mereset Password",
        message: result.ok ? result.data : result.error,
      });
      if (result.ok) {
        setResetTarget(null);
        setNewPasswordInput("");
      }
    });
  }

  function handleDeleteParticipantConfirm() {
    if (!deleteTarget) {
      return;
    }
    const formData = new FormData();
    formData.set("targetUserId", deleteTarget.id);

    startTransition(async () => {
      const result = await deleteParticipantAccountAction(formData);
      setDeleteTarget(null);
      setFeedback({
        ok: result.ok,
        title: result.ok
          ? "Akun Peserta Dihapus"
          : "Gagal Menghapus Akun Peserta",
        message: result.ok ? result.data : result.error,
      });
    });
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            Tambah Akun Peserta atau Admin Baru
          </h2>
          <p className="text-xs text-muted">
            Admin dapat menambahkan akun peserta maupun admin baru. Perhatian:
            akun dengan role Admin yang sudah dibuat tidak dapat dihapus atau
            diubah password-nya oleh admin lain.
          </p>
        </div>

        {createState && (
          <Notice variant={createState.ok ? "success" : "danger"}>
            <p>{createState.ok ? createState.data : createState.error}</p>
          </Notice>
        )}

        <form action={createAction} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="admin-create-name"
              className="block text-xs font-semibold text-foreground"
            >
              Nama Lengkap
            </label>
            <input
              id="admin-create-name"
              name="fullName"
              type="text"
              required
              placeholder="Nama pengguna"
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="admin-create-email"
              className="block text-xs font-semibold text-foreground"
            >
              Email
            </label>
            <input
              id="admin-create-email"
              name="email"
              type="email"
              required
              placeholder="email@contoh.com"
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="admin-create-password"
              className="block text-xs font-semibold text-foreground"
            >
              Password Awal
            </label>
            <PasswordInput
              id="admin-create-password"
              name="password"
              required
              placeholder="Minimal 8 karakter"
              className="py-2"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="admin-create-role"
              className="block text-xs font-semibold text-foreground"
            >
              Role Akun
            </label>
            <select
              id="admin-create-role"
              name="role"
              value={selectedRole}
              onChange={(e) =>
                setSelectedRole(e.target.value === "admin" ? "admin" : "user")
              }
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm"
            >
              <option value="user">Peserta (user)</option>
              <option value="admin">Administrator (admin)</option>
            </select>
          </div>

          {selectedRole === "admin" && (
            <div className="sm:col-span-2">
              <Notice variant="caution">
                <p>
                  Anda sedang memilih pembuatan akun{" "}
                  <strong>Administrator</strong>. Setelah dibuat, akun admin ini
                  tidak dapat dihapus atau direset password-nya melalui panel
                  admin.
                </p>
              </Notice>
            </div>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" disabled={isCreating}>
              {isCreating
                ? "Membuat Akun..."
                : selectedRole === "admin"
                  ? "Tambah Akun Admin"
                  : "Tambah Akun Peserta"}
            </Button>
          </div>
        </form>
      </Card>

      {feedback && (
        <Notice variant={feedback.ok ? "success" : "danger"}>
          <p>{feedback.message}</p>
        </Notice>
      )}

      {resetTarget && (
        <Card className="border-accent bg-surface-selected/40 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            Reset Password Peserta: {resetTarget.fullName || resetTarget.email}{" "}
            ({resetTarget.email})
          </h3>
          <form
            onSubmit={handleResetPasswordSubmit}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="flex-1 min-w-56 space-y-1">
              <label
                htmlFor="reset-participant-pwd"
                className="block text-xs font-medium text-foreground"
              >
                Password Baru Peserta
              </label>
              <PasswordInput
                id="reset-participant-pwd"
                required
                minLength={8}
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="py-2"
              />
            </div>
            <Button type="submit" variant="primary" disabled={isMutating}>
              {isMutating ? "Menyimpan..." : "Simpan Password Baru"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setResetTarget(null);
                setNewPasswordInput("");
              }}
            >
              Batal
            </Button>
          </form>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Daftar Akun Terdaftar ({users.length})
          </h2>
          <span className="text-xs text-muted">
            Role bersifat permanen sejak akun dibuat
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="py-2.5 pr-4 font-semibold">Nama</th>
                <th className="py-2.5 px-3 font-semibold">Email</th>
                <th className="py-2.5 px-3 font-semibold">Role</th>
                <th className="py-2.5 pl-3 font-semibold text-right">
                  Manajemen Akun
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((item) => {
                const isAdminAccount = item.role === "admin";
                return (
                  <tr key={item.id}>
                    <td className="py-3 pr-4 font-medium text-foreground">
                      {item.fullName || "—"}
                    </td>
                    <td className="py-3 px-3 text-xs text-muted">
                      {item.email}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={isAdminAccount ? "accent" : "neutral"}>
                        {isAdminAccount ? "Admin" : "Peserta"}
                      </Badge>
                    </td>
                    <td className="py-3 pl-3 text-right">
                      {isAdminAccount ? (
                        <span className="text-xs text-muted italic">
                          Akun Admin Dilindungi
                        </span>
                      ) : (
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setDeleteTarget(null);
                              setResetTarget(item);
                            }}
                          >
                            Edit Password
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setResetTarget(null);
                              setDeleteTarget(item);
                            }}
                          >
                            Hapus
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Konfirmasi Hapus Akun Peserta"
        description={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus akun peserta "${deleteTarget.fullName || deleteTarget.email}" (${deleteTarget.email})? Seluruh profil dan riwayat pengerjaan peserta ini akan ikut terhapus secara permanen.`
            : ""
        }
        confirmLabel="Ya, Hapus Permanen"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isMutating}
        onConfirm={handleDeleteParticipantConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {createState && (
        <StatusPopup
          isOpen={isCreatePopupOpen}
          status={createState.ok ? "success" : "error"}
          title={
            createState.ok
              ? "Akun Berhasil Dibuat"
              : "Gagal Membuat Akun Baru"
          }
          message={createState.ok ? createState.data : createState.error}
          onClose={() => setDismissedCreateState(createState)}
        />
      )}

      {feedback && (
        <StatusPopup
          isOpen={Boolean(feedback)}
          status={feedback.ok ? "success" : "error"}
          title={feedback.title}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}
    </div>
  );
}
