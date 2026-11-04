"use client";

import type { AttemptAnswer, QuestionPublic } from "@/lib/types";

export interface QuestionGridProps {
  questions: readonly QuestionPublic[];
  answersByQuestionId: Readonly<Record<string, AttemptAnswer>>;
  currentIndex: number;
  onSelectIndex: (index: number) => void;
}

export function QuestionGrid({
  questions,
  answersByQuestionId,
  currentIndex,
  onSelectIndex,
}: QuestionGridProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="font-semibold text-foreground">Navigasi Nomor</span>
        <span>{questions.length} soal</span>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2">
        {questions.map((question, index) => {
          const answer = answersByQuestionId[question.id];
          const isAnswered = (answer?.selectedOptions.length ?? 0) > 0;
          const isMarked = Boolean(answer?.isMarked);
          const isCurrent = index === currentIndex;

          const ariaStatus = [
            `Soal ${index + 1}`,
            isAnswered ? "terjawab" : "kosong",
            isMarked ? "ditandai" : "",
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <button
              key={question.id}
              type="button"
              aria-label={ariaStatus}
              aria-current={isCurrent ? "step" : undefined}
              onClick={() => onSelectIndex(index)}
              className={`rounded-xl py-2 text-xs font-medium transition-all cursor-pointer ${
                isCurrent
                  ? "bg-accent text-white ring-2 ring-accent ring-offset-1"
                  : isAnswered
                    ? "bg-surface-selected text-accent border border-accent/30"
                    : "bg-surface text-foreground border border-border hover:bg-surface-soft"
              } ${isMarked ? "outline-2 outline-amber-600 -outline-offset-2" : ""}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-surface-selected border border-accent/40" />
          Terjawab
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs border-2 border-amber-600" />
          Ditandai
        </span>
      </div>
    </div>
  );
}

