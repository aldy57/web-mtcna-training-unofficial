import { Badge } from "@/components/ui/Badge";
import { isAnswerCorrect } from "@/lib/scoring";
import type {
  OptionKey,
  QuestionOptions,
  QuestionWithSolution,
} from "@/lib/types";

function formatAnswerText(
  options: QuestionOptions,
  selectedKeys: readonly string[],
): string {
  if (selectedKeys.length === 0) {
    return "Belum dijawab";
  }
  return selectedKeys
    .map((key) => {
      const optionLabel = options[key as OptionKey] ?? "";
      return `${key}. ${optionLabel}`;
    })
    .join("; ");
}

export interface SolutionNoticeProps {
  solution: QuestionWithSolution;
  selectedOptions: readonly OptionKey[];
}

export function SolutionNotice({
  solution,
  selectedOptions,
}: SolutionNoticeProps) {
  const hasAnswered = selectedOptions.length > 0;
  const isCorrect = isAnswerCorrect(selectedOptions, solution.answerKey);
  const correctKeys = solution.answerKey.split("");

  const statusLabel = !hasAnswered
    ? "Belum dijawab"
    : isCorrect
      ? "Benar"
      : "Salah";

  const badgeVariant = !hasAnswered
    ? "caution"
    : isCorrect
      ? "success"
      : "neutral";

  return (
    <div className="rounded-2xl border border-border bg-surface-soft p-5 text-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-foreground">Pembahasan Soal</span>
        <Badge variant={badgeVariant}>{statusLabel}</Badge>
      </div>

      <div className="space-y-1.5 text-xs sm:text-sm">
        <p>
          <span className="font-semibold text-foreground">Jawaban Anda: </span>
          <span className="text-muted">
            {formatAnswerText(solution.options, selectedOptions)}
          </span>
        </p>
        <p>
          <span className="font-semibold text-foreground">Jawaban benar: </span>
          <span className="font-medium text-emerald-800">
            {formatAnswerText(solution.options, correctKeys)}
          </span>
        </p>
      </div>

      <p className="text-sm text-foreground leading-relaxed">
        {solution.explanation}
      </p>

      {solution.sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-muted">
          <span>Referensi:</span>
          {solution.sources.map((source, index) => (
            <span key={source.id}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent underline hover:text-accent-hover"
              >
                {source.title}
              </a>
              {index < solution.sources.length - 1 ? " · " : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

