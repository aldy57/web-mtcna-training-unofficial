import "server-only";
import {
  getQuestionBank,
  getQuestionRecordsByIds,
  toPublicQuestion,
  toQuestionWithSolution,
} from "@/lib/questions-repo";
import {
  calculateHistoricalTopicMastery,
  evaluateQuizAttempt,
  isAnswerCorrect,
  isDeadlineExpired,
  parseSelectedOptions,
} from "@/lib/scoring";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidTopicKey } from "@/lib/topics";
import type {
  Attempt,
  AttemptAnswer,
  AttemptStatus,
  Language,
  QuestionPublic,
  QuestionWithSolution,
  QuizMode,
  QuizResultSummary,
  TopicKey,
} from "@/lib/types";

interface DbAttemptRow {
  id: string;
  user_id: string;
  parent_attempt_id: string | null;
  mode: QuizMode;
  lang: Language;
  topic: string | null;
  question_ids: string[];
  started_at: string;
  deadline_at: string | null;
  finished_at: string | null;
  score: number | string | null;
  status: AttemptStatus;
}

interface DbAttemptAnswerRow {
  attempt_id: string;
  question_id: string;
  selected: string;
  marked: boolean;
  is_correct: boolean | null;
}

function mapAttemptRow(row: DbAttemptRow): Attempt {
  return {
    id: row.id,
    userId: row.user_id,
    parentAttemptId: row.parent_attempt_id,
    mode: row.mode,
    language: row.lang,
    topic: row.topic && isValidTopicKey(row.topic) ? row.topic : null,
    questionIds: row.question_ids ?? [],
    startedAt: row.started_at,
    deadlineAt: row.deadline_at,
    finishedAt: row.finished_at,
    scorePercent: row.score === null ? null : Number(row.score),
    status: row.status,
  };
}

function mapAnswerRow(row: DbAttemptAnswerRow): AttemptAnswer {
  return {
    attemptId: row.attempt_id,
    questionId: row.question_id,
    selectedOptions: parseSelectedOptions(row.selected),
    isMarked: Boolean(row.marked),
    isCorrect: row.is_correct,
  };
}

export async function finalizeAttemptOnServer(
  attemptId: string,
  forceExpired: boolean = false,
): Promise<Attempt | null> {
  const adminClient = createSupabaseAdminClient();
  const { data: rawAttempt, error } = await adminClient
    .from("attempts")
    .select("*")
    .eq("id", attemptId)
    .single<DbAttemptRow>();

  if (error || !rawAttempt) {
    return null;
  }

  if (rawAttempt.status !== "in_progress") {
    return mapAttemptRow(rawAttempt);
  }

  const { data: rawAnswers } = await adminClient
    .from("attempt_answers")
    .select("*")
    .eq("attempt_id", attemptId)
    .returns<DbAttemptAnswerRow[]>();

  const { questions } = await getQuestionRecordsByIds(rawAttempt.question_ids);
  const answersByQuestionId: Record<string, string[]> = {};

  for (const ans of rawAnswers ?? []) {
    answersByQuestionId[ans.question_id] = parseSelectedOptions(ans.selected);
  }

  const expiredByClock =
    forceExpired || isDeadlineExpired(rawAttempt.deadline_at);
  const summary = evaluateQuizAttempt({
    attemptId,
    mode: rawAttempt.mode,
    language: rawAttempt.lang,
    questions,
    answersByQuestionId,
    isExpired: expiredByClock,
  });

  const nextStatus: AttemptStatus = expiredByClock ? "expired" : "completed";
  const finishedAt = new Date().toISOString();

  for (const question of questions) {
    const selected = answersByQuestionId[question.id] ?? [];
    if (selected.length === 0) {
      continue;
    }
    const correct = isAnswerCorrect(selected, question.answerKey);
    await adminClient
      .from("attempt_answers")
      .update({ is_correct: correct })
      .eq("attempt_id", attemptId)
      .eq("question_id", question.id);
  }

  const { data: updatedRow } = await adminClient
    .from("attempts")
    .update({
      status: nextStatus,
      finished_at: finishedAt,
      score: summary.scorePercent,
    })
    .eq("id", attemptId)
    .select("*")
    .single<DbAttemptRow>();

  return updatedRow ? mapAttemptRow(updatedRow) : mapAttemptRow(rawAttempt);
}

export interface ActiveAttemptSessionData {
  attempt: Attempt;
  questions: QuestionPublic[];
  answersByQuestionId: Record<string, AttemptAnswer>;
  unlockedSolutionsByQuestionId: Record<string, QuestionWithSolution>;
}

export async function getAttemptSessionForUser(
  attemptId: string,
  userId: string,
  isAdmin: boolean = false,
): Promise<ActiveAttemptSessionData | null> {
  const adminClient = createSupabaseAdminClient();
  const { data: rawAttempt, error } = await adminClient
    .from("attempts")
    .select("*")
    .eq("id", attemptId)
    .single<DbAttemptRow>();

  if (error || !rawAttempt) {
    return null;
  }
  if (rawAttempt.user_id !== userId && !isAdmin) {
    return null;
  }

  let attempt = mapAttemptRow(rawAttempt);
  if (
    attempt.status === "in_progress" &&
    attempt.mode === "tryout" &&
    isDeadlineExpired(attempt.deadlineAt)
  ) {
    const finalized = await finalizeAttemptOnServer(attempt.id, true);
    if (finalized) {
      attempt = finalized;
    }
  }

  const { data: rawAnswers } = await adminClient
    .from("attempt_answers")
    .select("*")
    .eq("attempt_id", attemptId)
    .returns<DbAttemptAnswerRow[]>();

  const answersByQuestionId: Record<string, AttemptAnswer> = {};
  for (const row of rawAnswers ?? []) {
    answersByQuestionId[row.question_id] = mapAnswerRow(row);
  }

  const { questions: records, references } = await getQuestionRecordsByIds(
    attempt.questionIds,
  );

  const publicQuestions = records.map((record) =>
    toPublicQuestion(record, attempt.language),
  );

  const unlockedSolutionsByQuestionId: Record<string, QuestionWithSolution> =
    {};

  const isSessionFinished = attempt.status !== "in_progress";
  for (const record of records) {
    const savedAnswer = answersByQuestionId[record.id];
    const isLockedInStudyMode =
      attempt.mode !== "tryout" && Boolean(savedAnswer);

    if (isSessionFinished || isLockedInStudyMode) {
      unlockedSolutionsByQuestionId[record.id] = toQuestionWithSolution(
        record,
        attempt.language,
        references,
      );
    }
  }

  return {
    attempt,
    questions: publicQuestions,
    answersByQuestionId,
    unlockedSolutionsByQuestionId,
  };
}

export interface CompletedAttemptReportData {
  attempt: Attempt;
  summary: QuizResultSummary;
  questionsWithSolutions: QuestionWithSolution[];
  answersByQuestionId: Record<string, AttemptAnswer>;
}

export async function getCompletedAttemptReport(
  attemptId: string,
  userId: string,
  isAdmin: boolean = false,
): Promise<CompletedAttemptReportData | null> {
  const session = await getAttemptSessionForUser(attemptId, userId, isAdmin);
  if (!session) {
    return null;
  }

  let { attempt } = session;
  if (attempt.status === "in_progress") {
    if (attempt.mode === "tryout" && isDeadlineExpired(attempt.deadlineAt)) {
      const finalized = await finalizeAttemptOnServer(attempt.id, true);
      if (finalized) {
        attempt = finalized;
      }
    } else {
      return null;
    }
  }

  const { questions: records, references } = await getQuestionRecordsByIds(
    attempt.questionIds,
  );

  const selectedMap: Record<string, string[]> = {};
  for (const [questionId, answer] of Object.entries(
    session.answersByQuestionId,
  )) {
    selectedMap[questionId] = answer.selectedOptions;
  }

  const summary = evaluateQuizAttempt({
    attemptId: attempt.id,
    mode: attempt.mode,
    language: attempt.language,
    questions: records,
    answersByQuestionId: selectedMap,
    isExpired: attempt.status === "expired",
  });

  const questionsWithSolutions = records.map((record) =>
    toQuestionWithSolution(record, attempt.language, references),
  );

  return {
    attempt,
    summary,
    questionsWithSolutions,
    answersByQuestionId: session.answersByQuestionId,
  };
}

export interface UserDashboardStats {
  recentAttempts: Attempt[];
  totalTryouts: number;
  bestTryoutScore: number | null;
  latestTryoutScore: number | null;
  topicMastery: Record<
    TopicKey,
    { correct: number; total: number; percent: number }
  >;
}

export async function getUserDashboardStats(
  userId: string,
): Promise<UserDashboardStats> {
  const adminClient = createSupabaseAdminClient();
  const { data: attemptRows } = await adminClient
    .from("attempts")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(20)
    .returns<DbAttemptRow[]>();

  const attempts = (attemptRows ?? []).map(mapAttemptRow);
  const completedAttempts = attempts.filter(
    (item) => item.status !== "in_progress",
  );
  const completedTryouts = completedAttempts.filter(
    (item) => item.mode === "tryout" && item.scorePercent !== null,
  );

  const latestTryoutScore = completedTryouts[0]?.scorePercent ?? null;
  const bestTryoutScore =
    completedTryouts.length > 0
      ? Math.max(...completedTryouts.map((item) => item.scorePercent ?? 0))
      : null;

  const completedIds = completedAttempts.map((item) => item.id);
  const breakdowns = [];

  if (completedIds.length > 0) {
    const [{ questions: allQuestions }, { data: answerRows }] =
      await Promise.all([
        getQuestionBank(),
        adminClient
          .from("attempt_answers")
          .select("*")
          .in("attempt_id", completedIds)
          .returns<DbAttemptAnswerRow[]>(),
      ]);

    const questionById = new Map(allQuestions.map((q) => [q.id, q]));
    const answersByAttempt = new Map<string, Record<string, string[]>>();

    for (const row of answerRows ?? []) {
      const current = answersByAttempt.get(row.attempt_id) ?? {};
      current[row.question_id] = parseSelectedOptions(row.selected);
      answersByAttempt.set(row.attempt_id, current);
    }

    for (const item of completedAttempts) {
      const attemptQuestions = item.questionIds
        .map((id) => questionById.get(id))
        .filter((q): q is NonNullable<typeof q> => Boolean(q));
      const summary = evaluateQuizAttempt({
        attemptId: item.id,
        mode: item.mode,
        language: item.language,
        questions: attemptQuestions,
        answersByQuestionId: answersByAttempt.get(item.id) ?? {},
      });
      breakdowns.push(summary.topicBreakdown);
    }
  }

  return {
    recentAttempts: attempts.slice(0, 10),
    totalTryouts: completedTryouts.length,
    bestTryoutScore,
    latestTryoutScore,
    topicMastery: calculateHistoricalTopicMastery(breakdowns),
  };
}

