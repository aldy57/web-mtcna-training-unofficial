"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AI_FEATURE_LABELS } from "@/lib/constants";
import { formatAppDateTime } from "@/lib/format-date";
import { formatScorePercent } from "@/lib/scoring";
import type { AiUsageLogEntry } from "@/lib/types";

export interface AiUsageHistoryProps {
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

export function AiUsageHistory({ logs }: AiUsageHistoryProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const currentLogs = logs.slice(startIdx, startIdx + PAGE_SIZE);

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

  return (
    <div ref={containerRef} id="riwayat-pemakaian-ai" className="scroll-mt-20">
      <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-foreground">
            Riwayat Pemakaian Kuota AI
          </h2>
          <p className="text-xs text-muted">
            Catatan penggunaan fitur AI berkuota pada akun Anda.
          </p>
        </div>

        {logs.length > 0 && (
          <div className="text-right space-y-0.5">
            <span className="text-xs text-muted block">
              Total {logs.length} riwayat tercatat
            </span>
            <span className="text-xs text-muted block tabular-nums">
              Akumulasi:{" "}
              <strong className="font-semibold text-foreground">
                {logs
                  .reduce((sum, item) => sum + (item.tokensUsed || 0), 0)
                  .toLocaleString("id-ID")}{" "}
                token
              </strong>
            </span>
          </div>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-soft p-5 text-center text-xs text-muted">
          Belum ada riwayat pemakaian kuota AI.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-2.5 pr-4 font-semibold">Waktu</th>
                  <th className="py-2.5 px-4 font-semibold">Fitur</th>
                  <th className="py-2.5 px-4 font-semibold">Konteks</th>
                  <th className="py-2.5 pl-4 text-right font-semibold">
                    Total Penggunaan Kuota
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentLogs.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-3 pr-4 text-xs font-mono text-muted whitespace-nowrap">
                      {formatAppDateTime(entry.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {getLogFeatureLabel(entry)}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted">
                      {getLogContextLabel(entry)}
                    </td>
                    <td className="py-3 pl-4 text-right">
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
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/80">
              <span className="text-xs text-muted font-mono">
                Menampilkan {startIdx + 1}–
                {Math.min(startIdx + PAGE_SIZE, logs.length)} dari {logs.length}{" "}
                riwayat
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={safePage <= 1}
                  onClick={() => handlePageChange(Math.max(1, safePage - 1))}
                >
                  ← Sebelumnya
                </Button>

                {/* Nomor Halaman */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => handlePageChange(page)}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          page === safePage
                            ? "bg-accent text-white"
                            : "border border-border text-foreground hover:bg-neutral-100"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    handlePageChange(Math.min(totalPages, safePage + 1))
                  }
                >
                  Berikutnya →
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      </Card>
    </div>
  );
}
