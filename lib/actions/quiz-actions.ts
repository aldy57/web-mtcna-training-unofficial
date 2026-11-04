"use server";

import { revalidatePath } from "next/cache";
import {
  finalizeAttemptOnServer,
  getCompletedAttemptReport,
} from "@/lib/attempts-repo";
import { requireParticipantForAction } from "@/lib/auth";
import {
  getQuestionIdsForTopic,
  getQuestionIdsForTryout,
  getQuestionRecordsByIds,
  toQuestionWithSolution,
} from "@/lib/questions-repo";
import {
  calculateTryoutDeadline,
  findIncorrectOrBlankQuestionIds,
  isAnswerCorrect,
  isDeadlineExpired,
  serializeSelectedOptions,
} from "@/lib/scoring";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ActionResult,
  Language,
  OptionKey,
  QuestionWithSolution,
  QuizMode,
  TopicKey,
} from "@/lib/types";
import {
  finishAttemptSchema,
  saveAnswerSchema,
  startAttemptSchema,
  toggleMarkSchema,
} from "@/lib/validation";

export async function startAttemptAction(input: {
  mode: QuizMode;
  language: Language;
  topic?: TopicKey;
  parentAttemptId?: string;
}): Promise<ActionResult<{ attemptId: string }>> {
  const auth = await requireParticipantForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = startAttemptSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Parameter sesi latihan tidak valid." };
  }

  const { mode, language, topic, parentAttemptId } = parsed.data;
  let questionIds: string[] = [];

  if (mode === "tryout") {
    questionIds = await getQuestionIdsForTryout();
  } else if (mode === "belajar") {
    if (!topic) {
      return { ok: false, error: "Pilih topik belajar terlebih dahulu." };
    }
    questionIds = await getQuestionIdsForTopic(topic);
  } else if (mode === "remedial") {
    if (!parentAttemptId) {
      return {
        ok: false,
        error: "Sesi tryout asal tidak ditemukan untuk latihan ulang.",
      };
    }
    const parentReport = await getCompletedAttemptReport(
      parentAttemptId,
      auth.user.id,
      auth.user.role === "admin",
    );
    if (!parentReport) {
      return { ok: false, error: "Hasil sesi sebelumnya tidak ditemukan." };
    }
    const { questions } = await getQuestionRecordsByIds(
      parentReport.attempt.questionIds,
    );
    const selectedByQuestion: Record<string, string[]> = {};
    for (const [qId, ans] of Object.entries(
      parentReport.answersByQuestionId,
    )) {
      selectedByQuestion[qId] = ans.selectedOptions;
    }
    questionIds = findIncorrectOrBlankQuestionIds(
      questions,
      selectedByQuestion,
    );
  }

  if (questionIds.length === 0) {
    return {
      ok: false,
      error: "Tidak ada soal yang perlu dikerjakan pada sesi ini.",
    };
  }

  const now = new Date();
  const deadlineAt =
    mode === "tryout" ? calculateTryoutDeadline(now).toISOString() : null;

  const adminClient = createSupabaseAdminClient();
  const { data: created, error } = await adminClient
    .from("attempts")
    .insert({
      user_id: auth.user.id,
      parent_attempt_id: parentAttemptId ?? null,
      mode,
      lang: language,
      topic: topic ?? null,
      question_ids: questionIds,
      started_at: now.toISOString(),
      deadline_at: deadlineAt,
      status: "in_progress",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !created) {
    return {
      ok: false,
      error: `Gagal memulai sesi latihan: ${error?.message ?? "Database error"}`,
    };
  }

  revalidatePath("/dashboard");
  return { ok: true, data: { attemptId: created.id } };
}

export interface SaveAnswerResponse {
  selectedOptions: OptionKey[];
  unlockedSolution?: QuestionWithSolution;
  isExpired?: boolean;
}

export async function saveAnswerAction(input: {
  attemptId: string;
  questionId: string;
  selectedOptions: OptionKey[];
  isSkipped?: boolean;
}): Promise<ActionResult<SaveAnswerResponse>> {
  const auth = await requireParticipantForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = saveAnswerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Format jawaban tidak valid." };
  }

  const { attemptId, questionId, selectedOptions, isSkipped } = parsed.data;
  if (!isSkipped && selectedOptions.length === 0) {
    return {
      ok: false,
      error:
        "Pilih jawaban terlebih dahulu, atau gunakan tombol Lewati bila tersedia.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: attempt } = await adminClient
    .from("attempts")
    .select("id, user_id, mode, lang, question_ids, deadline_at, status")
    .eq("id", attemptId)
    .single<{
      id: string;
      user_id: string;
      mode: QuizMode;
      lang: Language;
      question_ids: string[];
      deadline_at: string | null;
      status: string;
    }>();

  if (!attempt || attempt.user_id !== auth.user.id) {
    return { ok: false, error: "Sesi latihan tidak ditemukan." };
  }

  if (attempt.status !== "in_progress") {
    return {
      ok: false,
      error: "Sesi ini sudah selesai dan jawaban tidak dapat diubah lagi.",
    };
  }

  if (attempt.mode === "tryout" && isDeadlineExpired(attempt.deadline_at)) {
    await finalizeAttemptOnServer(attemptId, true);
    return {
      ok: true,
      data: { selectedOptions: [], isExpired: true },
    };
  }

  if (!attempt.question_ids.includes(questionId)) {
    return { ok: false, error: "Soal tidak terdaftar pada sesi ini." };
  }

  // Pada mode belajar & remedial, soal yang sudah disimpan terkunci (tidak bisa diubah ulang)
  if (attempt.mode !== "tryout") {
    const { data: existingAnswer } = await adminClient
      .from("attempt_answers")
      .select("question_id")
      .eq("attempt_id", attemptId)
      .eq("question_id", questionId)
      .maybeSingle();

    if (existingAnswer) {
      return {
        ok: false,
        error: "Jawaban untuk soal ini sudah dikunci dan dinilai.",
      };
    }
  }

  const finalOptions: OptionKey[] = isSkipped ? [] : selectedOptions;
  const serialized = serializeSelectedOptions(finalOptions);

  const { questions, references } = await getQuestionRecordsByIds([questionId]);
  const questionRecord = questions[0];
  if (!questionRecord) {
    return { ok: false, error: "Data soal tidak ditemukan." };
  }

  const isStudyOrRemedial = attempt.mode !== "tryout";
  const isCorrect = isStudyOrRemedial
    ? isAnswerCorrect(finalOptions, questionRecord.answerKey)
    : null;

  const { error: upsertError } = await adminClient
    .from("attempt_answers")
    .upsert(
      {
        attempt_id: attemptId,
        question_id: questionId,
        selected: serialized,
        is_correct: isCorrect,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "attempt_id,question_id" },
    );

  if (upsertError) {
    return {
      ok: false,
      error: `Gagal menyimpan jawaban: ${upsertError.message}`,
    };
  }

  const unlockedSolution = isStudyOrRemedial
    ? toQuestionWithSolution(questionRecord, attempt.lang, references)
    : undefined;

  return {
    ok: true,
    data: {
      selectedOptions: finalOptions,
      unlockedSolution,
    },
  };
}

export async function toggleMarkAction(input: {
  attemptId: string;
  questionId: string;
}): Promise<ActionResult<{ isMarked: boolean }>> {
  const auth = await requireParticipantForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = toggleMarkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Input tanda soal tidak valid." };
  }

  const { attemptId, questionId } = parsed.data;
  const adminClient = createSupabaseAdminClient();

  const { data: attempt } = await adminClient
    .from("attempts")
    .select("id, user_id, status")
    .eq("id", attemptId)
    .single<{ id: string; user_id: string; status: string }>();

  if (
    !attempt ||
    attempt.user_id !== auth.user.id ||
    attempt.status !== "in_progress"
  ) {
    return { ok: false, error: "Sesi latihan tidak aktif." };
  }

  const { data: existing } = await adminClient
    .from("attempt_answers")
    .select("selected, marked")
    .eq("attempt_id", attemptId)
    .eq("question_id", questionId)
    .maybeSingle<{ selected: string; marked: boolean }>();

  const nextMarked = !(existing?.marked ?? false);

  const { error } = await adminClient.from("attempt_answers").upsert(
    {
      attempt_id: attemptId,
      question_id: questionId,
      selected: existing?.selected ?? "",
      marked: nextMarked,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "attempt_id,question_id" },
  );

  if (error) {
    return { ok: false, error: "Gagal memperbarui tanda soal." };
  }

  return { ok: true, data: { isMarked: nextMarked } };
}

export async function finishAttemptAction(input: {
  attemptId: string;
}): Promise<ActionResult<{ attemptId: string }>> {
  const auth = await requireParticipantForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = finishAttemptSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "ID sesi latihan tidak valid." };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: attempt } = await adminClient
    .from("attempts")
    .select("id, user_id")
    .eq("id", parsed.data.attemptId)
    .single<{ id: string; user_id: string }>();

  if (!attempt || attempt.user_id !== auth.user.id) {
    return { ok: false, error: "Sesi latihan tidak ditemukan." };
  }

  await finalizeAttemptOnServer(attempt.id);
  revalidatePath(`/tryout/${attempt.id}`);
  revalidatePath(`/tryout/${attempt.id}/hasil`);
  revalidatePath("/dashboard");

  return { ok: true, data: { attemptId: attempt.id } };
}

