import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccountManagementPanel } from "@/components/admin/AccountManagementPanel";
import { getAdminUsers } from "@/lib/admin-repo";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Kelola Pengguna · Panel Admin",
};

async function UsersManagementContent() {
  await requireRole("admin");
  const users = await getAdminUsers();

  return (
    <div className="w-full space-y-6">
      {/* Navigasi Balik & Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Link href="/admin" className="hover:text-accent hover:underline">
            ← Kembali ke Ringkasan Admin
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">Kelola Pengguna</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Kelola Akun Peserta &amp; Admin
        </h1>
        <p className="text-sm text-muted">
          Buat akun peserta atau admin baru, reset kata sandi, dan hapus akun
          peserta dengan proteksi role server.
        </p>
      </div>

      <AccountManagementPanel users={users} />
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-20 animate-pulse rounded-2xl bg-surface-soft" />
          <div className="h-96 animate-pulse rounded-2xl bg-surface-soft" />
        </div>
      }
    >
      <UsersManagementContent />
    </Suspense>
  );
}

