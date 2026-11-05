"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  adjustParticipantAiQuotaAction,
  clearQuestionAiCacheAction,
  refreshGlobalAiQuotaAction,
  toggleGlobalAiEnabledAction,
} from "@/lib/actions/ai-admin-actions";
import { formatScorePercent } from "@/lib/scoring";
import type {
  AiGlobalQuotaStatus,
  AiQuotaStatus,
  UserProfile,
} from "@/lib/types";

interface AiQuotaPanelProps {
  initialGlobalStatus: AiGlobalQuotaStatus;
  participants: UserProfile[];
  initialQuotas: Record<string, AiQuotaStatus>;
  cachedExplanationCount: number;
}

const QUICK_ADD_PERCENT = 50;

export function AiQuotaPanel({
  initialGlobalStatus,
  participants,
  initialQuotas,
  cachedExplanationCount,
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
  const [isPending, startTransition] = useTransition();

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
          ? "Layanan bantuan AI global diaktifkan."
          : "Layanan bantuan AI global dinonaktifkan sementara.",
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
                Status Kuota Global &amp; Sakelar Layanan AI
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
              Dipantau dari endpoint{" "}
              <code className="rounded bg-surface-soft px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                {globalStatus.endpointUrl || "GET /v1/quota"}
              </code>{" "}
              (cache berkala 5 menit)
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
              {!globalStatus.isEnabled
                ? "Layanan Nonaktif"
                : globalStatus.isExhausted
                  ? "Kuota Habis"
                  : `Sisa ${
                      globalStatus.remainingPercent !== null
                        ? `${formatScorePercent(globalStatus.remainingPercent)}%`
                        : "Aktif"
                    }`}
            </Badge>
          </div>
        </div>

        {/* 3-Column Token Metrics Grid */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface-soft p-3.5 space-y-1">
            <span className="text-xs font-medium text-muted">
              Total Kuota Token
            </span>
            <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
              {globalStatus.totalTokens !== null &&
              globalStatus.totalTokens !== undefined
                ? `${globalStatus.totalTokens.toLocaleString("id-ID")} token`
                : "50.000.000 token"}
            </div>
            <p className="text-[11px] text-muted">
              Batas kapasitas akun AI yang dikonfigurasi
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-soft p-3.5 space-y-1">
            <span className="text-xs font-medium text-muted">
              Token Terpakai
            </span>
            <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
              {globalStatus.usedTokens !== null &&
              globalStatus.usedTokens !== undefined
                ? `${globalStatus.usedTokens.toLocaleString("id-ID")} token`
                : "0 token"}
            </div>
            <p className="text-[11px] text-muted">
              {globalStatus.usedPercent !== null &&
              globalStatus.usedPercent !== undefined
                ? `${formatScorePercent(globalStatus.usedPercent)}% terpakai platform`
                : "0% terpakai"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-soft p-3.5 space-y-1">
            <span className="text-xs font-medium text-muted">
              Sisa Kuota Tersedia
            </span>
            <div
              className={`text-xl font-bold tracking-tight tabular-nums ${
                globalStatus.isLowWarning
                  ? "text-amber-700"
                  : globalStatus.isExhausted
                    ? "text-red-700"
                    : "text-emerald-700"
              }`}
            >
              {globalStatus.remainingTokens !== null &&
              globalStatus.remainingTokens !== undefined
                ? `${globalStatus.remainingTokens.toLocaleString("id-ID")} token`
                : "—"}
            </div>
            <p className="text-[11px] text-muted">
              {globalStatus.remainingPercent !== null &&
              globalStatus.remainingPercent !== undefined
                ? `${formatScorePercent(globalStatus.remainingPercent)}% tersisa`
                : "Siap digunakan"}
            </p>
          </div>
        </div>

        {/* Progress Bar Sisa Kuota */}
        {globalStatus.remainingPercent !== null && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="font-medium text-foreground">
                Persentase Sisa Kuota Global
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatScorePercent(globalStatus.remainingPercent)}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className={`h-full transition-all duration-300 ${
                  globalStatus.isLowWarning
                    ? "bg-amber-500"
                    : globalStatus.isExhausted
                      ? "bg-red-500"
                      : "bg-primary"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, globalStatus.remainingPercent),
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Diagnostic Response Note (Bila Provider return HTML SPA / Fallback) */}
        {globalStatus.responseNote && (
          <div className="rounded-xl border border-border bg-surface-soft px-3.5 py-3 text-xs text-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-accent" />
              <span>Status Endpoint Kuota Provider:</span>
            </div>
            <p className="leading-relaxed text-muted">
              {globalStatus.responseNote}
            </p>
            <p className="text-[11px] text-muted pt-0.5">
              Besaran total kuota token dapat diubah kapan saja di file{" "}
              <code>.env</code> melalui variabel{" "}
              <code className="font-mono text-foreground">
                AI_TOTAL_PURCHASED_TOKENS=50000000
              </code>
              .
            </p>
          </div>
        )}

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

          <span className="text-[11px] text-muted">
            Terakhir diperiksa:{" "}
            {new Date(globalStatus.checkedAt).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </div>
      </Card>

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
            Kuota AI Peserta (Reset Otomatis 3 Hari setelah 0%)
          </h3>
          <span className="text-xs text-muted">
            {participants.length} peserta terdaftar
          </span>
        </div>

        {participants.length === 0 ? (
          <p className="text-xs text-muted py-2">Belum ada akun peserta.</p>
        ) : (
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
                {participants.map((user) => {
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
                        {quota?.resetAt
                          ? new Date(quota.resetAt).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "Aktif"}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={isPending}
                            onClick={() =>
                              handleAdjustUserQuota(user.id, "add_percent")
                            }
                          >
                            +{QUICK_ADD_PERCENT}%
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            disabled={isPending || remaining >= 100}
                            onClick={() =>
                              handleAdjustUserQuota(user.id, "reset")
                            }
                          >
                            Reset 100%
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
