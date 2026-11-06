"use client";

import { useState } from "react";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import type { AdminAttemptOverview } from "@/lib/admin-repo";
import { LANGUAGE_NAMES } from "@/lib/constants";
import { formatAppDateTime } from "@/lib/format-date";
import { calculatePagination } from "@/lib/pagination";
import { formatScorePercent } from "@/lib/scoring";

const ATTEMPTS_PER_PAGE = 10;

function FileTextIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

export interface RecentAttemptsPanelProps {
  attempts: readonly AdminAttemptOverview[];
}

export function RecentAttemptsPanel({ attempts }: RecentAttemptsPanelProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const { safePage, totalPages, startIdx, endIdx } = calculatePagination(
    attempts.length,
    currentPage,
    ATTEMPTS_PER_PAGE,
  );

  const paginatedAttempts = attempts.slice(startIdx, endIdx);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">
          Daftar Aktivitas Peserta ({attempts.length})
        </h2>
        <Badge variant="neutral">Total {attempts.length} Aktivitas</Badge>
      </div>

      {attempts.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">
          Belum ada aktivitas tryout atau latihan dari peserta.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-3 pr-4 font-semibold">Peserta</th>
                  <th className="py-3 px-3 font-semibold">Mode &amp; Topik</th>
                  <th className="py-3 px-3 font-semibold">Bahasa</th>
                  <th className="py-3 px-3 font-semibold">Waktu Mulai</th>
                  <th className="py-3 px-3 font-semibold">Skor</th>
                  <th className="py-3 pl-3 font-semibold text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedAttempts.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-surface-soft/60 transition-colors"
                  >
                    <td className="py-3.5 pr-4">
                      <span className="font-medium text-foreground block">
                        {item.userName}
                      </span>
                      <span className="text-xs text-muted">
                        {item.userEmail}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-xs font-semibold uppercase text-foreground">
                        {item.mode}
                      </span>
                      {item.topic && (
                        <span className="block text-xs text-muted">
                          {item.topic}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-muted">
                      {LANGUAGE_NAMES[item.language]}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-muted font-mono tabular-nums">
                      {formatAppDateTime(item.startedAt)}
                    </td>
                    <td className="py-3.5 px-3 tabular-nums">
                      {item.status === "in_progress" ? (
                        <Badge variant="caution">Berjalan</Badge>
                      ) : item.scorePercent !== null ? (
                        <span
                          className={`font-semibold ${
                            item.scorePercent >= 60
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }`}
                        >
                          {formatScorePercent(item.scorePercent)}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3.5 pl-3 text-right">
                      {item.status !== "in_progress" ? (
                        <ActionMenu
                          ariaLabel={`Aksi aktivitas peserta ${item.userName}`}
                          items={[
                            {
                              key: "view-result",
                              label: "Lihat Hasil",
                              href: `/tryout/${item.id}/hasil`,
                              icon: <FileTextIcon />,
                            },
                          ]}
                        />
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
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
            totalItems={attempts.length}
            pageSize={ATTEMPTS_PER_PAGE}
            itemLabel="aktivitas"
          />
        </>
      )}
    </Card>
  );
}

