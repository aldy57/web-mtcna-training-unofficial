import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuditLogPanel } from "@/components/admin/AuditLogPanel";
import { getAdminAuditLogs } from "@/lib/admin-repo";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Log Audit · Panel Admin",
};

async function AuditLogsContent() {
  await requireRole("admin");
  const auditLogs = await getAdminAuditLogs(100);

  return (
    <div className="w-full space-y-6">
      {/* Navigasi Balik & Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Link href="/admin" className="hover:text-accent hover:underline">
            ← Kembali ke Ringkasan Admin
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">Log Audit</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Log Audit Aktivitas Admin
        </h1>
        <p className="text-sm text-muted">
          Rekam jejak seluruh aksi administratif, pembuatan akun, perubahan
          kunci soal, dan penyesuaian kuota.
        </p>
      </div>

      <AuditLogPanel auditLogs={auditLogs} />
    </div>
  );
}

export default function AdminAuditPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-20 animate-pulse rounded-2xl bg-surface-soft" />
          <div className="h-96 animate-pulse rounded-2xl bg-surface-soft" />
        </div>
      }
    >
      <AuditLogsContent />
    </Suspense>
  );
}
