import { AiResetCountdown } from "@/components/ai/AiResetCountdown";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
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
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AiQuotaBar({ quota, compact = false }: AiQuotaBarProps) {
  const remainingPct = Math.max(0, Math.min(100, quota.remainingPercent));
  const usedPct = Math.max(0, Math.min(100, quota.usedPercent));

  const barColorClass = quota.isExhausted
    ? "bg-red-600"
    : remainingPct <= 25
      ? "bg-amber-600"
      : "bg-accent";

  const badgeVariant = quota.isExhausted
    ? "caution"
    : remainingPct <= 25
      ? "caution"
      : "success";

  const statusText = quota.isExhausted
    ? "Kuota Habis (0%)"
    : `Tersedia ${formatScorePercent(remainingPct)}%`;

  if (compact) {
    return (
      <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-foreground">
            Sisa Kuota AI Anda:{" "}
            <span className="tabular-nums text-accent">
              {formatScorePercent(remainingPct)}%
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
              <span className="font-semibold text-amber-800 shrink-0">
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
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            Kuota Bantuan AI
          </h2>
          <p className="text-xs text-muted">
            Digunakan untuk fitur Jelaskan Jawaban Saya, Tanya AI, dan
            Rekomendasi Belajar pasca-tryout. Penjelasan AI umum (cache) gratis
            dan tidak mengurangi kuota.
          </p>
        </div>
        <Badge variant={badgeVariant}>{statusText}</Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-3xl font-bold tracking-tight text-accent tabular-nums">
            {formatScorePercent(remainingPct)}%
          </span>
          <span className="text-xs text-muted tabular-nums">
            Terpakai {formatScorePercent(usedPct)}% dari 100%
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
            Kuota akan kembali penuh (100%) pada:{" "}
            <strong className="font-semibold">
              {formatResetDateTime(quota.resetAt)}
            </strong>
            . Selama masa tunggu, Anda tetap dapat membuka{" "}
            <strong>Penjelasan AI (Gratis · Cache)</strong> pada setiap soal.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted">
          Apabila kuota mencapai 0%, kuota akan direset otomatis kembali ke 100%
          setelah 1 hari (24 jam).
        </p>
      )}
    </Card>
  );
}

