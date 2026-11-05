"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { askAiQuestionAction } from "@/lib/actions/ai-actions";
import type { AiQuotaStatus, Language } from "@/lib/types";
import { UI_STRINGS } from "@/lib/ui-strings";

export interface AskAiBoxProps {
  attemptId: string;
  questionId: string;
  language: Language;
  isQuotaExhausted?: boolean;
  onQuotaUpdated?: (quota: AiQuotaStatus) => void;
}

export function AskAiBox({
  attemptId,
  questionId,
  language,
  isQuotaExhausted = false,
  onQuotaUpdated,
}: AskAiBoxProps) {
  const [prevQuestionId, setPrevQuestionId] = useState(questionId);
  const [prompt, setPrompt] = useState<string>("");
  const [submittedQuestion, setSubmittedQuestion] = useState<string>("");
  const [answerText, setAnswerText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  if (prevQuestionId !== questionId) {
    setPrevQuestionId(questionId);
    setPrompt("");
    setSubmittedQuestion("");
    setAnswerText(null);
    setErrorMessage("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isPending || isQuotaExhausted) {
      return;
    }

    setErrorMessage("");
    startTransition(async () => {
      const result = await askAiQuestionAction({
        attemptId,
        questionId,
        language,
        prompt: trimmed,
      });

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      setSubmittedQuestion(trimmed);
      setAnswerText(result.data.answer);
      onQuotaUpdated?.(result.data.quota);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={`ask-ai-input-${questionId}`}
          className="text-xs font-semibold uppercase tracking-wider text-foreground"
        >
          Tanya AI Seputar Soal Ini
        </label>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <textarea
          id={`ask-ai-input-${questionId}`}
          rows={3}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          disabled={isPending || isQuotaExhausted}
          placeholder={UI_STRINGS.ai.askPlaceholder}
          className="w-full rounded-xl border border-border bg-surface-soft px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-accent disabled:opacity-60"
        />

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted">
            Fokus pada konsep MTCNA &amp; konfigurasi MikroTik RouterOS.
          </span>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isPending || isQuotaExhausted || prompt.trim().length < 5}
          >
            {isPending ? UI_STRINGS.ai.askLoading : UI_STRINGS.ai.askSubmit}
          </Button>
        </div>
      </form>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-danger-bg px-3.5 py-2.5 text-xs text-danger-ink"
        >
          {errorMessage}
        </div>
      )}

      {answerText && (
        <div className="rounded-xl border border-accent/20 bg-surface-soft p-3.5 space-y-2">
          {submittedQuestion && (
            <p className="text-xs font-medium text-muted">
              Pertanyaan: <span className="text-foreground">{submittedQuestion}</span>
            </p>
          )}
          <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-line">
            {answerText}
          </div>
        </div>
      )}
    </div>
  );
}

