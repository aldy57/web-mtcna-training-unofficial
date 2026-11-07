"use client";

import { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { AI_FEATURE_LABELS } from "@/lib/constants";
import { formatAppDateTime } from "@/lib/format-date";
import { formatScorePercent } from "@/lib/scoring";
import type { AiUsageLogEntry } from "@/lib/types";

export interface AdminAiUsageHistoryProps {
  logs: readonly AiUsageLogEntry[];
}

const PAGE_SIZE = 10;

function getLogFeatureLabel(entry: AiUsageLogEntry): string {
  if (!entry.attemptId && !entry.questionId) {
    return "MIRA AI";
  }
  return AI_FEATURE_LABELS[entry.feature] ?? entry.feature;
}

function getLogContextLabel(entry: AiUsageLogEntry): string {
  if (entry.questionId) {
    return `Soal ${entry.questionId}`;
  }
  if (entry.attemptId) {
    return "Evaluasi Tryout";
  }
  return "Chat AI";
}

export function AdminAiUsageHistory({ logs }: AdminAiUsageHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return logs;
    }
    return logs.filter((item) => {
      const matchName = item.userName?.toLowerCase().includes(q) ?? false;
      const matchEmail = item.userEmail?.toLowerCase().includes(q) ?? false;
      const matchFeature =
        getLogFeatureLabel(item).toLowerCase().includes(q) ||
        item.feature.toLowerCase().includes(q);
      const matchContext =
        getLogContextLabel(item).toLowerCase().includes(q) ||
        (item.questionId?.toLowerCase().includes(q) ?? false);
      return matchName || matchEmail || matchFeature || matchContext;
    });
  }, [logs, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const currentLogs = filteredLogs.slice(startIdx, startIdx + PAGE_SIZE);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }

  function handlePageChange(newPage: number) {
    setCurrentPage(newPage);
    if (typeof window !== "undefined" && containerRef.current) {
      const topOffset =
        containerRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({
        top: Math.max(0, topOffset),
        behavior: "smooth",
      });
    }
  }

  const totalTokensAccumulated = useMemo(() => {
    return logs.reduce((sum, item) => sum + (item.tokensUsed || 0), 0);
  }, [logs]);

  return (
    <div
      ref={containerRef}
      id="riwayat-pemakaian-ai-seluruh-pengguna"
      className="scroll-mt-20"
    >
      <Card className="p-4 sm:p-6 space-y-4 overflow-hidden">
        {/* Header Bagian Riwayat */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-foreground">
              Riwayat Penggunaan Token Seluruh Pengguna
            </h2>
            <p className="text-xs text-muted">
              Catatan penggunaan token AI dari seluruh akun yang terdaftar di database.
            </p>
          </div>

          {logs.length > 0 && (
            <div className="text-left sm:text-right space-y-0.5">
              <span className="text-xs text-muted block">
                Total {logs.length} riwayat tercatat
              </span>
              <span className="text-xs text-muted block tabular-nums">
                Akumulasi:{" "}
                <strong className="font-semibold text-foreground">
                  {totalTokensAccumulated.toLocaleString("id-ID")} token
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Input Pencarian Pengguna / Fitur / Konteks */}
        {logs.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="w-full sm:max-w-xs">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Cari nama, email, soal, atau fitur..."
                className="w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            {searchQuery && (
              <span className="text-xs text-muted">
                Ditemukan {filteredLogs.length} dari {logs.length} riwayat
              </span>
            )}
          </div>
        )}

        {/* Status Kosong */}
        {filteredLogs.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-soft p-5 text-center text-xs text-muted">
            {logs.length === 0
              ? "Belum ada riwayat pemakaian token AI dari pengguna mana pun."
              : "Tidak ada riwayat pemakaian token yang sesuai dengan pencarian."}
          </div>
        ) : (
          <>
            {/* Tampilan List Responsif Khusus Mobile */}
            <div className="sm:hidden divide-y divide-border">
              {currentLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div>
                      <p className="font-semibold text-foreground text-xs leading-snug truncate">
                        {entry.userName || "Peserta"}
                      </p>
                      {entry.userEmail && (
                        <p className="text-[11px] text-muted truncate">
                          {entry.userEmail}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted text-[11px]">
                      <span className="font-medium text-foreground">
                        {getLogFeatureLabel(entry)}
                      </span>
                      <span>•</span>
                      <span className="truncate max-w-[100px]">
                        {getLogContextLabel(entry)}
                      </span>
                      <span>•</span>
                      <span className="font-mono shrink-0">
                        {formatAppDateTime(entry.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="neutral">
                      {(entry.tokensUsed ?? 0).toLocaleString("id-ID")} token
                    </Badge>
                    <span className="text-[11px] text-muted tabular-nums block mt-0.5">
                      -{formatScorePercent(entry.percentUsed)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Tampilan Tabel Khusus Layar Tablet/Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="py-2.5 pr-3 font-semibold">Waktu</th>
                    <th className="py-2.5 px-3 font-semibold">Pengguna</th>
                    <th className="py-2.5 px-3 font-semibold">Fitur</th>
                    <th className="py-2.5 px-3 font-semibold">Konteks</th>
                    <th className="py-2.5 pl-3 text-right font-semibold">
                      Total Penggunaan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentLogs.map((entry) => (
                    <tr key={entry.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 pr-3 font-mono text-muted whitespace-nowrap">
                        {formatAppDateTime(entry.createdAt)}
                      </td>
                      <td className="py-3 px-3 min-w-[160px]">
                        <span className="font-medium text-foreground block truncate">
                          {entry.userName || "Peserta"}
                        </span>
                        {entry.userEmail && (
                          <span className="text-muted block truncate text-[11px]">
                            {entry.userEmail}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground">
                        {getLogFeatureLabel(entry)}
                      </td>
                      <td className="py-3 px-3 text-muted">
                        {getLogContextLabel(entry)}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <div className="inline-flex flex-col items-end">
                          <Badge variant="neutral">
                            {(entry.tokensUsed ?? 0).toLocaleString("id-ID")} token
                          </Badge>
                          <span className="text-[11px] text-muted tabular-nums mt-0.5">
                            -{formatScorePercent(entry.percentUsed)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Kontrol Pagination 10 Item per Halaman */}
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={filteredLogs.length}
              pageSize={PAGE_SIZE}
              itemLabel="riwayat"
            />
          </>
        )}
      </Card>
    </div>
  );
}

