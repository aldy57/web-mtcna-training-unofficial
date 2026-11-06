"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import type { AdminAuditEntry } from "@/lib/admin-repo";
import { formatAppDateTime } from "@/lib/format-date";
import { calculatePagination } from "@/lib/pagination";

const LOGS_PER_PAGE = 10;

export interface AuditLogPanelProps {
  auditLogs: readonly AdminAuditEntry[];
}

export function AuditLogPanel({ auditLogs }: AuditLogPanelProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const { safePage, totalPages, startIdx, endIdx } = calculatePagination(
    auditLogs.length,
    currentPage,
    LOGS_PER_PAGE,
  );

  const paginatedLogs = auditLogs.slice(startIdx, endIdx);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">
          Daftar Catatan Audit ({auditLogs.length})
        </h2>
        <Badge variant="neutral">Total {auditLogs.length} Log</Badge>
      </div>

      {auditLogs.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">
          Belum ada catatan log aktivitas admin.
        </p>
      ) : (
        <>
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
                {paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-surface-soft/60 transition-colors"
                  >
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
                    <td className="py-3 pl-3 text-right text-muted font-mono text-xs tabular-nums">
                      {formatAppDateTime(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={auditLogs.length}
            pageSize={LOGS_PER_PAGE}
            itemLabel="log audit"
          />
        </>
      )}
    </Card>
  );
}

