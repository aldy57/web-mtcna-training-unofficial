"use client";

import { useState, useTransition } from "react";
import { FormattedAiText } from "@/components/ai/FormattedAiText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getOrCreateAiRecommendationAction } from "@/lib/actions/ai-actions";
import type { AiQuotaStatus } from "@/lib/types";
import { UI_STRINGS } from "@/lib/ui-strings";

export interface AiRecommendationCardProps {
  attemptId: string;
  initialRecommendation?: string | null;
  initialQuota?: AiQuotaStatus | null;
}

export function AiRecommendationCard({
  attemptId,
  initialRecommendation = null,
  initialQuota = null,
}: AiRecommendationCardProps) {
  const [recommendationText, setRecommendationText] = useState<string | null>(
    initialRecommendation,
  );
  const [quota, setQuota] = useState<AiQuotaStatus | null>(initialQuota);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const isExhausted = Boolean(quota?.isExhausted);

  function handleGenerate() {
    setErrorMessage("");
    startTransition(async () => {
      const result = await getOrCreateAiRecommendationAction({ attemptId });
      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      setRecommendationText(result.data.content);
      setQuota(result.data.quota);
    });
  }

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">
          {UI_STRINGS.ai.recommendationTitle}
        </h2>
        <p className="text-xs text-muted">
          Analisis otomatis topik terlemah dan prioritas materi yang
          perlu Anda pelajari ulang dari hasil sesi ini.
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-danger-bg px-3.5 py-2.5 text-xs text-danger-ink"
        >
          {errorMessage}
        </div>
      )}

      {recommendationText ? (
        <div className="rounded-xl border border-accent/20 bg-surface-soft p-4">
          <FormattedAiText
            content={recommendationText}
            className="text-xs sm:text-sm text-foreground"
          />
        </div>
      ) : (
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPending || isExhausted}
            onClick={handleGenerate}
          >
            {isPending
              ? UI_STRINGS.ai.recommendationLoading
              : UI_STRINGS.ai.recommendationButton}
          </Button>
        </div>
      )}
    </Card>
  );
}

