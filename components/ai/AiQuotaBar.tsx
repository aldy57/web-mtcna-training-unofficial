import { AiResetCountdown } from "@/components/ai/AiResetCountdown";
import { Card } from "@/components/ui/Card";
import { formatAppDateTime } from "@/lib/format-date";
import { formatScorePercent } from "@/lib/scoring";
import type { AiQuotaStatus } from "@/lib/types";
import { UI_STRINGS } from "@/lib/ui-strings";

export interface AiQuotaBarProps {
  quota: AiQuotaStatus;
  compact?: boolean;
}

function formatResetDateTime(iso: string | null): string {
  if (!iso) {
    return "1 hari setelah mencapai 0%";
  }
  return formatAppDateTime(iso);
}

export function AiQuotaBar({ quota, compact = false }: AiQuotaBarProps) {
  const remainingPct = Math.max(0, Math.min(100, quota.remainingPercent));
  const usedPct = Math.max(0, Math.min(100, quota.usedPercent));

  const barColorClass = quota.isExhausted
    ? "bg-red-600"
    : remainingPct <= 25
      ? "bg-amber-600"
      : "bg-accent";

  if (compact) {
    return (
      <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-foreground">
            Sisa Kuota AI Anda:{" "}
            <span className="tabular-nums text-accent">
              {formatScorePercent(remainingPct)}%
            </span>{" "}
            <span className="text-muted text-[11px]">
              (Total {quota.tokenBudget.toLocaleString("id-ID")} token)
            </span>
          </span>
          <span className="text-muted tabular-nums">
            Terpakai {formatScorePercent(usedPct)}%
          </span>
        </div>

        <div
          className="h-2 w-full overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-label="Sisa kuota AI"
          aria-valuenow={Math.round(remainingPct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
            style={{ width: `${remainingPct}%` }}
          />
        </div>

        {quota.isExhausted && (
          <p className="text-xs text-caution-ink flex items-center justify-between gap-2">
            <span>
              {UI_STRINGS.ai.userExhaustedNotice} ({formatResetDateTime(quota.resetAt)})
            </span>
            {quota.resetAt && (
              <span
                className="font-semibold text-amber-800 shrink-0"
                suppressHydrationWarning
              >
                Reset: <AiResetCountdown resetAt={quota.resetAt} />
              </span>
            )}
          </p>
        )}
      </div>
    );
  }

  return (
    <Card className="space-y-4">
      {/* Header Kartu Token AI */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            Token AI
          </h2>
          <p className="text-xs text-muted">
            Digunakan untuk fitur Tanya AI, MIRA AI, Jelaskan Jawaban Saya, dan
            Rekomendasi Belajar pasca-tryout.
          </p>
        </div>

        <div className="shrink-0">
          <span className="inline-flex items-center rounded-xl bg-surface-soft border border-border px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs">
            Total Kuota: {quota.tokenBudget.toLocaleString("id-ID")} token
          </span>
        </div>
      </div>

      {/* Baris Metrik Persentase & Token Terpakai */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-accent tabular-nums">
              {formatScorePercent(remainingPct)}%
            </span>
            <span className="text-xs text-muted font-medium">
              Sisa Kuota
            </span>
          </div>

          <span className="text-xs text-muted tabular-nums">
            Terpakai {formatScorePercent(usedPct)}% dari 100% ({quota.tokensUsed.toLocaleString("id-ID")} / {quota.tokenBudget.toLocaleString("id-ID")} token)
          </span>
        </div>

        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-surface-soft border border-border/60"
          role="progressbar"
          aria-label="Persentase sisa kuota AI"
          aria-valuenow={Math.round(remainingPct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
            style={{ width: `${remainingPct}%` }}
          />
        </div>
      </div>

      {quota.isExhausted ? (
        <div className="rounded-xl border border-caution-border bg-caution-bg px-4 py-3 text-xs text-caution-ink space-y-1">
          <p className="font-semibold">{UI_STRINGS.ai.userExhaustedNotice}</p>
          <p>
            Token akan kembali penuh pada:{" "}
            <strong className="font-semibold font-mono">
              {formatResetDateTime(quota.resetAt)}
            </strong>
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted">
          Kuota token akan direset otomatis kembali ke 100% setiap siklus 1 hari
          (24 jam) atau setelah masa reset tercapai.
        </p>
      )}
    </Card>
  );
}
