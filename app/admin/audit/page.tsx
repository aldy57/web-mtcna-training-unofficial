import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Log Audit Aktivitas Admin
            </h1>
            <p className="text-sm text-muted">
              Rekam jejak seluruh aksi administratif, pembuatan akun, perubahan
              kunci soal, dan penyesuaian kuota.
            </p>
          </div>
          <Badge variant="neutral">Total {auditLogs.length} Log</Badge>
        </div>
      </div>

      <Card>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">
            Belum ada catatan log aktivitas admin.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="py-2.5 pr-4 font-semibold">Aksi</th>
                  <th className="py-2.5 px-3 font-semibold">Target ID</th>
                  <th className="py-2.5 px-3 font-semibold">Detail Parameter</th>
                  <th className="py-2.5 pl-3 font-semibold text-right">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-soft/60 transition-colors">
                    <td className="py-3 pr-4 font-mono font-semibold text-foreground">
                      <span className="rounded bg-surface-soft px-1.5 py-0.5 border border-border">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-muted">
                      {log.targetId}
                    </td>
                    <td className="py-3 px-3 text-muted max-w-xs truncate font-mono text-[11px]">
                      {Object.keys(log.details).length > 0
                        ? JSON.stringify(log.details)
                        : "—"}
                    </td>
                    <td className="py-3 pl-3 text-right text-muted tabular-nums">
                      {new Date(log.createdAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
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

