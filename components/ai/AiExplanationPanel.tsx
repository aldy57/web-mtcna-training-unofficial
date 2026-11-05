"use client";

import { useState, useTransition } from "react";
import { AskAiBox } from "@/components/ai/AskAiBox";
import { Button } from "@/components/ui/Button";
import {
  getGeneralAiExplanationAction,
  getPersonalAiExplanationAction,
  getUserAiQuotaAction,
} from "@/lib/actions/ai-actions";
import type { AiQuotaStatus, Language } from "@/lib/types";
import { UI_STRINGS } from "@/lib/ui-strings";

export interface AiExplanationPanelProps {
  attemptId: string;
  questionId: string;
  language: Language;
}

export function AiExplanationPanel({
  attemptId,
  questionId,
  language,
}: AiExplanationPanelProps) {
  const [prevQuestionId, setPrevQuestionId] = useState(questionId);
  const [explanationText, setExplanationText] = useState<string | null>(null);
  const [personalText, setPersonalText] = useState<string | null>(null);
  const [isAskOpen, setIsAskOpen] = useState<boolean>(false);
  const [quota, setQuota] = useState<AiQuotaStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isGeneralPending, startGeneralTransition] = useTransition();
  const [isPersonalPending, startPersonalTransition] = useTransition();

  if (prevQuestionId !== questionId) {
    setPrevQuestionId(questionId);
    setExplanationText(null);
    setPersonalText(null);
    setIsAskOpen(false);
    setErrorMessage("");
  }

  function handleLoadGeneralExplanation() {
    setErrorMessage("");
    startGeneralTransition(async () => {
      const result = await getGeneralAiExplanationAction({
        attemptId,
        questionId,
        language,
      });

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      setExplanationText(result.data.content);
    });
  }

  function handleLoadPersonalExplanation() {
    setErrorMessage("");
    startPersonalTransition(async () => {
      const result = await getPersonalAiExplanationAction({
        attemptId,
        questionId,
        language,
      });

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      setPersonalText(result.data.content);
      setQuota(result.data.quota);
    });
  }

  function handleToggleAskAi() {
    const nextOpen = !isAskOpen;
    setIsAskOpen(nextOpen);
    if (nextOpen && !quota) {
      void getUserAiQuotaAction().then((res) => {
        if (res.ok) {
          setQuota(res.data);
        }
      });
    }
  }

  const isExhausted = Boolean(quota?.isExhausted);

  return (
    <div className="pt-3 border-t border-border/80 space-y-3">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted">Tanyakan ke AI</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isGeneralPending}
            onClick={handleLoadGeneralExplanation}
          >
            {isGeneralPending
              ? UI_STRINGS.ai.generalLoading
              : UI_STRINGS.ai.generalButton}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPersonalPending || isExhausted}
            onClick={handleLoadPersonalExplanation}
          >
            {isPersonalPending
              ? UI_STRINGS.ai.personalLoading
              : UI_STRINGS.ai.personalButton}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleToggleAskAi}
          >
            {isAskOpen ? "Tutup Tanya AI" : UI_STRINGS.ai.askButton}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-danger-bg px-3.5 py-2.5 text-xs text-danger-ink"
        >
          {errorMessage}
        </div>
      )}

      {explanationText && (
        <div className="rounded-xl border border-accent/20 bg-surface p-4 space-y-2">
          <span className="block text-xs font-semibold uppercase tracking-wider text-accent">
            {UI_STRINGS.ai.generalTitle}
          </span>
          <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-line">
            {explanationText}
          </div>
        </div>
      )}

      {personalText && (
        <div className="rounded-xl border border-accent/20 bg-surface p-4 space-y-2">
          <span className="block text-xs font-semibold uppercase tracking-wider text-accent">
            {UI_STRINGS.ai.personalTitle}
          </span>
          <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-line">
            {personalText}
          </div>
        </div>
      )}

      {isAskOpen && (
        <AskAiBox
          attemptId={attemptId}
          questionId={questionId}
          language={language}
          isQuotaExhausted={isExhausted}
          onQuotaUpdated={(updatedQuota) => setQuota(updatedQuota)}
        />
      )}
    </div>
  );
}
