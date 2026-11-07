"use client";

import { useState, useTransition } from "react";
import { AdminAiUsageHistory } from "@/components/admin/AdminAiUsageHistory";
import { AiDynamicSettingsCard } from "@/components/admin/AiDynamicSettingsCard";
import { AiResetCountdown } from "@/components/ai/AiResetCountdown";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import {
  adjustParticipantAiQuotaAction,
  clearQuestionAiCacheAction,
  refreshGlobalAiQuotaAction,
  toggleGlobalAiEnabledAction,
} from "@/lib/actions/ai-admin-actions";
import { formatAppDateTime } from "@/lib/format-date";
import { formatScorePercent } from "@/lib/scoring";
import type {
  AiDynamicSettings,
  AiGlobalQuotaStatus,
  AiQuotaStatus,
  AiUsageLogEntry,
  UserProfile,
} from "@/lib/types";

interface AiQuotaPanelProps {
  initialGlobalStatus: AiGlobalQuotaStatus;
  initialDynamicSettings: AiDynamicSettings;
  participants: UserProfile[];
  initialQuotas: Record<string, AiQuotaStatus>;
  cachedExplanationCount: number;
  usageLogs?: readonly AiUsageLogEntry[];
}

const QUICK_ADD_PERCENT = 50;
const PARTICIPANTS_PER_PAGE = 10;

function PlusCircleIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

function RefreshIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
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
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

export function AiQuotaPanel({
  initialGlobalStatus,
  initialDynamicSettings,
  participants,
  initialQuotas,
  cachedExplanationCount,
  usageLogs = [],
}: AiQuotaPanelProps) {
  const [globalStatus, setGlobalStatus] =
    useState<AiGlobalQuotaStatus>(initialGlobalStatus);
  const [quotas, setQuotas] =
    useState<Record<string, AiQuotaStatus>>(initialQuotas);
  const [cacheTargetId, setCacheTargetId] = useState("ALL");
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(
    1,
    Math.ceil(participants.length / PARTICIPANTS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PARTICIPANTS_PER_PAGE;
  const currentParticipants = participants.slice(
    startIdx,
    startIdx + PARTICIPANTS_PER_PAGE,
  );

  function handleToggleGlobal() {
    setFeedback(null);
    startTransition(async () => {
      const res = await toggleGlobalAiEnabledAction({
        isEnabled: !globalStatus.isEnabled,
      });
      if (!res.ok) {
        setFeedback({ type: "err", text: res.error });
        return;
      }
      setGlobalStatus(res.data);
      setFeedback({
        type: "ok",
        text: res.data.isEnabled
          ? "Layanan AI diaktifkan."
          : "Layanan AI dinonaktifkan sementara.",
      });
    });
  }

  function handleRefreshGlobal() {
    setFeedback(null);
    startTransition(async () => {
      const res = await refreshGlobalAiQuotaAction();
      if (!res.ok) {
        setFeedback({ type: "err", text: res.error });
        return;
      }
      setGlobalStatus(res.data);
      setFeedback({
        type: "ok",
        text: "Status kuota API global berhasil diperbarui dari server.",
      });
    });
  }

  function handleAdjustUserQuota(
    userId: string,
    action: "reset" | "add_percent",
  ) {
    setFeedback(null);
    startTransition(async () => {
      const res = await adjustParticipantAiQuotaAction({
        targetUserId: userId,
        action,
        percentToAdd: action === "add_percent" ? QUICK_ADD_PERCENT : undefined,
      });
      if (!res.ok) {
        setFeedback({ type: "err", text: res.error });
        return;
      }
      setQuotas((prev) => ({ ...prev, [userId]: res.data.quota }));
      setFeedback({ type: "ok", text: res.data.message });
    });
  }

  function handleClearCache() {
    setFeedback(null);
    startTransition(async () => {
      const res = await clearQuestionAiCacheAction({
        questionId: cacheTargetId,
      });
      if (!res.ok) {
        setFeedback({ type: "err", text: res.error });
        return;
      }
      setFeedback({ type: "ok", text: res.data });
    });
  }

  return (
    <div className="space-y-4">
      {globalStatus.isLowWarning && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950"
        >
          <p className="font-semibold">
            Peringatan Kuota API Global Rendah (&lt; 10%)
          </p>
          <p className="mt-0.5 leading-relaxed">
            Sisa kuota akun penyedia AI saat ini{" "}
            <strong>
              {globalStatus.remainingPercent !== null
                ? `${formatScorePercent(globalStatus.remainingPercent)}%`
                : "hampir habis"}
            </strong>
            . Segera lakukan top-up kuota agar fitur AI peserta tidak terputus.
          </p>
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-2.5 text-xs font-medium ${
            feedback.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Kartu Status Kuota Global & Sakelar AI */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                Statistik Penggunaan Token Platform &amp; Sakelar AI
              </h3>
              <Badge
                variant={
                  globalStatus.source === "remote" ? "accent" : "neutral"
                }
              >
                {globalStatus.source === "remote"
                  ? "Sinkronisasi Remote API"
                  : "Pelacakan Platform (Lokal)"}
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Konsumsi token dihitung secara presisi dari log interaksi peserta di database.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={
                !globalStatus.isEnabled
                  ? "neutral"
                  : globalStatus.isExhausted || globalStatus.isLowWarning
                    ? "caution"
                    : "success"
              }
            >
              {!globalStatus.isEnabled ? "Layanan Nonaktif" : "Layanan AI Aktif"}
            </Badge>
          </div>
        </div>

        {/* 3-Column Token Metrics Grid (Fokus ke Data Riil Platform) */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface-soft p-3.5 space-y-1">
            <span className="text-xs font-medium text-muted">
              Total Token Dikonsumsi Platform
            </span>
            <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
              {globalStatus.usedTokens !== null &&
              globalStatus.usedTokens !== undefined
                ? `${globalStatus.usedTokens.toLocaleString("id-ID")} token`
                : "0 token"}
            </div>
            <p className="text-[11px] text-muted">
              Akumulasi token yang digunakan seluruh peserta
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-soft p-3.5 space-y-1">
            <span className="text-xs font-medium text-muted">
              Total Peserta Terdaftar
            </span>
            <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
              {participants.length} peserta
            </div>
            <p className="text-[11px] text-muted">
              Pengguna aktif dengan jatah kuota harian
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-soft p-3.5 space-y-1">
            <span className="text-xs font-medium text-muted">
              Status Sakelar Operasional
            </span>
            <div
              className={`text-xl font-bold tracking-tight tabular-nums ${
                globalStatus.isEnabled ? "text-emerald-700" : "text-neutral-500"
              }`}
            >
              {globalStatus.isEnabled ? "Diaktifkan" : "Dinonaktifkan"}
            </div>
            <p className="text-[11px] text-muted">
              {globalStatus.isEnabled
                ? "MIRA AI dapat diakses oleh pengguna"
                : "Fitur AI dinonaktifkan sementara"}
            </p>
          </div>
        </div>

        {/* Info Note Provider (Jujur & Transparan) */}
        <div className="rounded-xl border border-border bg-surface-soft px-3.5 py-3 text-xs text-foreground space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
            <span>Informasi Saldo &amp; Pemantauan Provider:</span>
          </div>
          <p className="leading-relaxed text-muted">
            Provider AI (<code>router.ryzumi.net</code> / Neko-Router) tidak menyediakan API publik untuk membaca sisa saldo token secara remote melalui API key konsumen. Oleh karena itu, platform menghitung konsumsi token nyata yang telah dipakai oleh peserta secara presisi dari log database. Sisa saldo total akun Anda dapat dipantau langsung melalui dashboard web{" "}
            <a
              href="https://router.ryzumi.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent font-semibold underline hover:text-accent-hover inline-flex items-center gap-0.5"
            >
              router.ryzumi.net ↗
            </a>
            .
          </p>
        </div>

        {/* Action Controls & Timestamp */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={globalStatus.isEnabled ? "danger" : "primary"}
              disabled={isPending}
              onClick={handleToggleGlobal}
            >
              {globalStatus.isEnabled
                ? "Nonaktifkan AI Global"
                : "Aktifkan AI Global"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={handleRefreshGlobal}
            >
              Segarkan Status API
            </Button>
          </div>

          <span className="text-[11px] text-muted font-mono">
            Terakhir diperiksa: {formatAppDateTime(globalStatus.checkedAt)}
          </span>
        </div>
      </Card>

      {/* Kartu Pengaturan Konfigurasi AI Dinamis */}
      <AiDynamicSettingsCard initialSettings={initialDynamicSettings} />

      {/* Kartu Cache Penjelasan Soal AI */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Cache Penjelasan Umum AI per Soal
            </h3>
            <p className="text-xs text-muted">
              Tersimpan {cachedExplanationCount} penjelasan soal di database
            </p>
          </div>
          <Badge variant="accent">Hemat Token</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            type="text"
            value={cacheTargetId}
            onChange={(event) =>
              setCacheTargetId(event.target.value.toUpperCase())
            }
            placeholder="ALL atau A01"
            aria-label="Kode soal untuk hapus cache AI"
            className="w-32 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-mono text-foreground"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={handleClearCache}
          >
            Bersihkan Cache
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Kuota AI Peserta (Reset Otomatis 1 Hari setelah 0%)
          </h3>
          <span className="text-xs text-muted">
            {participants.length} peserta terdaftar
          </span>
        </div>

        {participants.length === 0 ? (
          <p className="text-xs text-muted py-2">Belum ada akun peserta.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="py-2 pr-3 font-semibold">Peserta</th>
                  <th className="py-2 px-3 font-semibold">Sisa Kuota</th>
                  <th className="py-2 px-3 font-semibold">Jadwal Reset</th>
                  <th className="py-2 pl-3 font-semibold text-right">
                    Tindakan Kuota
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentParticipants.map((user) => {
                  const quota = quotas[user.id];
                  const remaining = quota?.remainingPercent ?? 100;
                  return (
                    <tr key={user.id}>
                      <td className="py-2.5 pr-3">
                        <span className="font-medium text-foreground block">
                          {user.fullName || "Peserta"}
                        </span>
                        <span className="text-muted">{user.email}</span>
                      </td>
                      <td className="py-2.5 px-3 tabular-nums">
                        <Badge
                          variant={
                            remaining <= 25 ? "caution" : "success"
                          }
                        >
                          {formatScorePercent(remaining)}%
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-muted">
                        {quota?.resetAt ? (
                          <div className="space-y-0.5">
                            <div className="font-mono text-xs">
                              {formatAppDateTime(quota.resetAt)}
                            </div>
                            <div
                              className="text-[11px] font-mono text-amber-700"
                              suppressHydrationWarning
                            >
                              (sisa <AiResetCountdown resetAt={quota.resetAt} />)
                            </div>
                          </div>
                        ) : (
                          "Aktif"
                        )}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <ActionMenu
                          ariaLabel={`Tindakan kuota untuk ${user.fullName || user.email}`}
                          items={[
                            {
                              key: "add_percent",
                              label: `Tambah Kuota (+${QUICK_ADD_PERCENT}%)`,
                              icon: <PlusCircleIcon />,
                              disabled: isPending,
                              onClick: () =>
                                handleAdjustUserQuota(user.id, "add_percent"),
                            },
                            {
                              key: "reset",
                              label: "Reset Kuota (100%)",
                              icon: <RefreshIcon />,
                              variant: "accent",
                              disabled: isPending || remaining >= 100,
                              onClick: () =>
                                handleAdjustUserQuota(user.id, "reset"),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={participants.length}
              pageSize={PARTICIPANTS_PER_PAGE}
              itemLabel="peserta"
            />
          </>
        )}
      </Card>

      {/* Kartu Riwayat Penggunaan Token Seluruh Pengguna */}
      <AdminAiUsageHistory logs={usageLogs} />
    </div>
  );
}
