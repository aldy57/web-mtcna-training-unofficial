import {
  OPTION_KEYS,
  PASSING_SCORE_PERCENT,
  TRYOUT_DURATION_MS,
} from "@/lib/constants";
import { TOPICS, TOPIC_KEYS } from "@/lib/topics";
import type {
  Language,
  OptionKey,
  QuestionRecord,
  QuizMode,
  QuizResultSummary,
  TopicKey,
  TopicScoreRow,
} from "@/lib/types";

const WEAK_TOPIC_LIMIT = 3;
const PERFECT_SCORE_PERCENT = 100;

export function normalizeOptionList(options: readonly string[]): OptionKey[] {
  const uniqueValid = new Set<OptionKey>();
  for (const item of options) {
    const trimmed = item.trim().toUpperCase();
    if (OPTION_KEYS.includes(trimmed as OptionKey)) {
      uniqueValid.add(trimmed as OptionKey);
    }
  }
  return Array.from(uniqueValid).sort();
}

export function serializeSelectedOptions(
  options: readonly string[],
): string {
  return normalizeOptionList(options).join("");
}

export function parseSelectedOptions(serialized: string): OptionKey[] {
  if (!serialized) {
    return [];
  }
  return normalizeOptionList(serialized.split(""));
}

export function isAnswerCorrect(
  selectedOptions: readonly string[],
  answerKey: string,
): boolean {
  const normalizedSelected = serializeSelectedOptions(selectedOptions);
  const normalizedKey = serializeSelectedOptions(answerKey.split(""));
  if (!normalizedSelected || !normalizedKey) {
    return false;
  }
  return normalizedSelected === normalizedKey;
}

export function calculateScorePercent(
  correctCount: number,
  totalQuestions: number,
): number {
  if (totalQuestions <= 0) {
    return 0;
  }
  const rawPercent = (PERFECT_SCORE_PERCENT * correctCount) / totalQuestions;
  return Number(rawPercent.toFixed(2));
}

export function hasPassedTryout(scorePercent: number): boolean {
  return scorePercent >= PASSING_SCORE_PERCENT;
}

export function formatScorePercent(scorePercent: number): string {
  if (Number.isInteger(scorePercent)) {
    return String(scorePercent);
  }
  return scorePercent.toFixed(1).replace(".", ",");
}

export function calculateTryoutDeadline(startedAt: Date = new Date()): Date {
  return new Date(startedAt.getTime() + TRYOUT_DURATION_MS);
}

export function isDeadlineExpired(
  deadlineAtIso: string | null,
  now: Date = new Date(),
): boolean {
  if (!deadlineAtIso) {
    return false;
  }
  const deadlineTime = new Date(deadlineAtIso).getTime();
  return now.getTime() >= deadlineTime;
}

export function calculateTopicBreakdown(
  questions: readonly Pick<QuestionRecord, "id" | "topic" | "answerKey">[],
  answersByQuestionId: Readonly<Record<string, readonly string[]>>,
): TopicScoreRow[] {
  const rows: TopicScoreRow[] = [];

  for (const topicKey of TOPIC_KEYS) {
    const topicQuestions = questions.filter(
      (question) => question.topic === topicKey,
    );
    if (topicQuestions.length === 0) {
      continue;
    }

    const correctCount = topicQuestions.filter((question) =>
      isAnswerCorrect(
        answersByQuestionId[question.id] ?? [],
        question.answerKey,
      ),
    ).length;

    rows.push({
      topic: topicKey,
      topicLabel: TOPICS[topicKey],
      correctCount,
      totalCount: topicQuestions.length,
      scorePercent: calculateScorePercent(correctCount, topicQuestions.length),
    });
  }

  return rows;
}

export function selectWeakestTopics(
  topicBreakdown: readonly TopicScoreRow[],
): TopicScoreRow[] {
  return topicBreakdown
    .filter((row) => row.scorePercent < PERFECT_SCORE_PERCENT)
    .slice()
    .sort((first, second) => first.scorePercent - second.scorePercent)
    .slice(0, WEAK_TOPIC_LIMIT);
}

export interface EvaluateAttemptInput {
  attemptId: string;
  mode: QuizMode;
  language: Language;
  questions: readonly Pick<QuestionRecord, "id" | "topic" | "answerKey">[];
  answersByQuestionId: Readonly<Record<string, readonly string[]>>;
  isExpired?: boolean;
}

export function evaluateQuizAttempt(
  input: EvaluateAttemptInput,
): QuizResultSummary {
  const {
    attemptId,
    mode,
    language,
    questions,
    answersByQuestionId,
    isExpired = false,
  } = input;

  let correctCount = 0;
  let blankCount = 0;

  for (const question of questions) {
    const selected = normalizeOptionList(
      answersByQuestionId[question.id] ?? [],
    );
    if (selected.length === 0) {
      blankCount++;
      continue;
    }
    if (isAnswerCorrect(selected, question.answerKey)) {
      correctCount++;
    }
  }

  const totalQuestions = questions.length;
  const wrongCount = totalQuestions - correctCount - blankCount;
  const scorePercent = calculateScorePercent(correctCount, totalQuestions);
  const topicBreakdown = calculateTopicBreakdown(
    questions,
    answersByQuestionId,
  );

  return {
    attemptId,
    mode,
    language,
    totalQuestions,
    correctCount,
    wrongCount,
    blankCount,
    scorePercent,
    hasPassed: hasPassedTryout(scorePercent),
    isExpired,
    topicBreakdown,
    weakestTopics: selectWeakestTopics(topicBreakdown),
  };
}

export function findIncorrectOrBlankQuestionIds(
  questions: readonly Pick<QuestionRecord, "id" | "answerKey">[],
  answersByQuestionId: Readonly<Record<string, readonly string[]>>,
): string[] {
  return questions
    .filter(
      (question) =>
        !isAnswerCorrect(
          answersByQuestionId[question.id] ?? [],
          question.answerKey,
        ),
    )
    .map((question) => question.id);
}

export function calculateHistoricalTopicMastery(
  attemptsWithTopicScores: readonly TopicScoreRow[][],
): Record<TopicKey, { correct: number; total: number; percent: number }> {
  const accumulator = Object.fromEntries(
    TOPIC_KEYS.map((key) => [key, { correct: 0, total: 0, percent: 0 }]),
  ) as Record<TopicKey, { correct: number; total: number; percent: number }>;

  for (const breakdown of attemptsWithTopicScores) {
    for (const row of breakdown) {
      const entry = accumulator[row.topic];
      entry.correct += row.correctCount;
      entry.total += row.totalCount;
    }
  }

  for (const key of TOPIC_KEYS) {
    const entry = accumulator[key];
    entry.percent = calculateScorePercent(entry.correct, entry.total);
  }

  return accumulator;
}

