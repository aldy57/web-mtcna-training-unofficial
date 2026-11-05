"use server";

import {
  aiExplanationInputSchema,
  aiRecommendationInputSchema,
  askAiInputSchema,
  chatAiInputSchema,
  type ChatAiInput,
} from "@/lib/ai/ai-config";
import { callAiChatCompletion } from "@/lib/ai/client";
import { getCachedAiExplanation } from "@/lib/ai/explanation-cache";
import {
  answerParticipantQuestion,
  generatePersonalExplanation,
  getOrGenerateGeneralExplanation,
  type GeneralExplanationResult,
} from "@/lib/ai/explanation-service";
import {
  getAiEnabledSetting,
  getGlobalAiQuotaStatus,
} from "@/lib/ai/global-quota";
import { buildTutorChatMessages } from "@/lib/ai/prompts";
import {
  consumeUserAiQuota,
  getUserAiQuotaStatus,
} from "@/lib/ai/quota";
import {
  getOrGenerateAiRecommendation,
  getSavedAiRecommendation,
} from "@/lib/ai/recommendation-service";
import {
  getAttemptSessionForUser,
  getCompletedAttemptReport,
} from "@/lib/attempts-repo";
import {
  requireParticipantForAction,
  requireUserForAction,
} from "@/lib/auth";
import type { ActionResult, AiQuotaStatus, Language } from "@/lib/types";
import { UI_STRINGS } from "@/lib/ui-strings";

export async function getUserAiQuotaAction(): Promise<
  ActionResult<AiQuotaStatus>
> {
  const auth = await requireParticipantForAction();
  if (!auth.ok) {
    return auth;
  }

  const quota = await getUserAiQuotaStatus(auth.user.id);
  return { ok: true, data: quota };
}

export async function getGeneralAiExplanationAction(input: {
  attemptId: string;
  questionId: string;
  language: Language;
}): Promise<ActionResult<GeneralExplanationResult>> {
  const auth = await requireParticipantForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = aiExplanationInputSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue =
      parsed.error.issues[0]?.message ?? "Parameter permintaan AI tidak valid.";
    return { ok: false, error: firstIssue };
  }

  const { attemptId, questionId, language } = parsed.data;

  const isEnabled = await getAiEnabledSetting();
  if (!isEnabled) {
    return { ok: false, error: UI_STRINGS.ai.disabledNotice };
  }

  const session = await getAttemptSessionForUser(
    attemptId,
    auth.user.id,
    false,
  );
  if (!session) {
    return { ok: false, error: "Sesi latihan tidak ditemukan." };
  }

  const unlockedSolution = session.unlockedSolutionsByQuestionId[questionId];
  if (!unlockedSolution) {
    return {
      ok: false,
      error:
        "Penjelasan AI hanya tersedia setelah jawaban soal dikunci atau sesi tryout selesai.",
    };
  }

  try {
    const cached = await getCachedAiExplanation(questionId, language);
    if (cached) {
      return {
        ok: true,
        data: { content: cached.content, fromCache: true },
      };
    }

    const globalQuota = await getGlobalAiQuotaStatus({
      isEnabledOverride: isEnabled,
    });
    if (globalQuota.isExhausted) {
      return { ok: false, error: UI_STRINGS.ai.globalExhaustedNotice };
    }
    if (!globalQuota.isAvailable) {
      return {
        ok: false,
        error:
          "Layanan AI belum dikonfigurasi di server. Pastikan AI_API_KEY telah diatur.",
      };
    }

    const result = await getOrGenerateGeneralExplanation(
      unlockedSolution,
      language,
    );
    return { ok: true, data: result };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal memuat penjelasan AI saat ini.";
    return { ok: false, error: message };
  }
}

export async function getOrCreateAiRecommendationAction(input: {
  attemptId: string;
}): Promise<
  ActionResult<{
    content: string;
    fromSaved: boolean;
    quota: AiQuotaStatus;
  }>
> {
  const auth = await requireParticipantForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = aiRecommendationInputSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue =
      parsed.error.issues[0]?.message ?? "ID sesi tryout tidak valid.";
    return { ok: false, error: firstIssue };
  }

  const { attemptId } = parsed.data;

  const isEnabled = await getAiEnabledSetting();
  if (!isEnabled) {
    return { ok: false, error: UI_STRINGS.ai.disabledNotice };
  }

  const report = await getCompletedAttemptReport(
    attemptId,
    auth.user.id,
    false,
  );
  if (!report) {
    return {
      ok: false,
      error:
        "Rekomendasi AI hanya tersedia untuk sesi latihan atau tryout yang telah selesai.",
    };
  }

  try {
    const currentQuota = await getUserAiQuotaStatus(auth.user.id);
    const existing = await getSavedAiRecommendation(attemptId);
    if (existing) {
      return {
        ok: true,
        data: {
          content: existing.content,
          fromSaved: true,
          quota: currentQuota,
        },
      };
    }

    if (currentQuota.isExhausted) {
      return { ok: false, error: UI_STRINGS.ai.userExhaustedNotice };
    }

    const globalQuota = await getGlobalAiQuotaStatus({
      isEnabledOverride: isEnabled,
    });
    if (globalQuota.isExhausted) {
      return { ok: false, error: UI_STRINGS.ai.globalExhaustedNotice };
    }
    if (!globalQuota.isAvailable) {
      return {
        ok: false,
        error:
          "Layanan AI belum dikonfigurasi di server. Pastikan AI_API_KEY telah diatur.",
      };
    }

    const generated = await getOrGenerateAiRecommendation({
      attemptId: report.attempt.id,
      userId: auth.user.id,
      language: report.attempt.language,
      summary: report.summary,
    });

    const updatedQuota = generated.fromSaved
      ? currentQuota
      : await consumeUserAiQuota({
          userId: auth.user.id,
          tokensUsed: generated.tokensUsed,
          feature: "recommendation",
          attemptId: report.attempt.id,
        });

    return {
      ok: true,
      data: {
        content: generated.content,
        fromSaved: generated.fromSaved,
        quota: updatedQuota,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal menyusun rekomendasi belajar AI saat ini.";
    return { ok: false, error: message };
  }
}

export async function getPersonalAiExplanationAction(input: {
  attemptId: string;
  questionId: string;
  language: Language;
}): Promise<
  ActionResult<{
    content: string;
    quota: AiQuotaStatus;
  }>
> {
  const auth = await requireParticipantForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = aiExplanationInputSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue =
      parsed.error.issues[0]?.message ?? "Parameter permintaan AI tidak valid.";
    return { ok: false, error: firstIssue };
  }

  const { attemptId, questionId, language } = parsed.data;

  const isEnabled = await getAiEnabledSetting();
  if (!isEnabled) {
    return { ok: false, error: UI_STRINGS.ai.disabledNotice };
  }

  const session = await getAttemptSessionForUser(
    attemptId,
    auth.user.id,
    false,
  );
  if (!session) {
    return { ok: false, error: "Sesi latihan tidak ditemukan." };
  }

  const unlockedSolution = session.unlockedSolutionsByQuestionId[questionId];
  if (!unlockedSolution) {
    return {
      ok: false,
      error:
        "Penjelasan jawaban hanya tersedia setelah jawaban soal dikunci atau sesi tryout selesai.",
    };
  }

  try {
    const currentQuota = await getUserAiQuotaStatus(auth.user.id);
    if (currentQuota.isExhausted) {
      return { ok: false, error: UI_STRINGS.ai.userExhaustedNotice };
    }

    const globalQuota = await getGlobalAiQuotaStatus({
      isEnabledOverride: isEnabled,
    });
    if (globalQuota.isExhausted) {
      return { ok: false, error: UI_STRINGS.ai.globalExhaustedNotice };
    }
    if (!globalQuota.isAvailable) {
      return {
        ok: false,
        error:
          "Layanan AI belum dikonfigurasi di server. Pastikan AI_API_KEY telah diatur.",
      };
    }

    const selectedOptions =
      session.answersByQuestionId[questionId]?.selectedOptions ?? [];

    const generated = await generatePersonalExplanation({
      question: unlockedSolution,
      selectedOptions,
      language,
    });

    const updatedQuota = await consumeUserAiQuota({
      userId: auth.user.id,
      tokensUsed: generated.tokensUsed,
      feature: "personal_explanation",
      questionId,
      attemptId,
    });

    return {
      ok: true,
      data: {
        content: generated.content,
        quota: updatedQuota,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal menganalisis jawaban Anda saat ini.";
    return { ok: false, error: message };
  }
}

export async function askAiQuestionAction(input: {
  attemptId: string;
  questionId: string;
  language: Language;
  prompt: string;
}): Promise<
  ActionResult<{
    answer: string;
    quota: AiQuotaStatus;
  }>
> {
  const auth = await requireParticipantForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = askAiInputSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue =
      parsed.error.issues[0]?.message ?? "Pertanyaan tidak valid.";
    return { ok: false, error: firstIssue };
  }

  const { attemptId, questionId, prompt } = parsed.data;

  const isEnabled = await getAiEnabledSetting();
  if (!isEnabled) {
    return { ok: false, error: UI_STRINGS.ai.disabledNotice };
  }

  const session = await getAttemptSessionForUser(
    attemptId,
    auth.user.id,
    false,
  );
  if (!session) {
    return { ok: false, error: "Sesi latihan tidak ditemukan." };
  }

  const unlockedSolution = session.unlockedSolutionsByQuestionId[questionId];
  if (!unlockedSolution) {
    return {
      ok: false,
      error:
        "Fitur Tanya AI hanya tersedia setelah jawaban soal dikunci atau sesi tryout selesai.",
    };
  }

  try {
    const currentQuota = await getUserAiQuotaStatus(auth.user.id);
    if (currentQuota.isExhausted) {
      return { ok: false, error: UI_STRINGS.ai.userExhaustedNotice };
    }

    const globalQuota = await getGlobalAiQuotaStatus({
      isEnabledOverride: isEnabled,
    });
    if (globalQuota.isExhausted) {
      return { ok: false, error: UI_STRINGS.ai.globalExhaustedNotice };
    }
    if (!globalQuota.isAvailable) {
      return {
        ok: false,
        error:
          "Layanan AI belum dikonfigurasi di server. Pastikan AI_API_KEY telah diatur.",
      };
    }

    const generated = await answerParticipantQuestion({
      question: unlockedSolution,
      participantPrompt: prompt,
    });

    const updatedQuota = await consumeUserAiQuota({
      userId: auth.user.id,
      tokensUsed: generated.tokensUsed,
      feature: "ask_ai",
      questionId,
      attemptId,
    });

    return {
      ok: true,
      data: {
        answer: generated.content,
        quota: updatedQuota,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal memproses pertanyaan AI saat ini.";
    return { ok: false, error: message };
  }
}

export interface SendChatAiResult {
  reply: string;
  tokensUsed: number;
  quota: AiQuotaStatus | null;
}

export async function sendChatAiMessageAction(
  input: ChatAiInput,
): Promise<ActionResult<SendChatAiResult>> {
  const auth = await requireUserForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = chatAiInputSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue =
      parsed.error.issues[0]?.message ?? "Pesan chat tidak valid.";
    return { ok: false, error: firstIssue };
  }

  const isEnabled = await getAiEnabledSetting();
  if (!isEnabled) {
    return { ok: false, error: UI_STRINGS.ai.disabledNotice };
  }

  const isParticipant = auth.user.role === "user";

  if (isParticipant) {
    const currentQuota = await getUserAiQuotaStatus(auth.user.id);
    if (currentQuota.isExhausted) {
      return { ok: false, error: UI_STRINGS.ai.userExhaustedNotice };
    }
  }

  const globalQuota = await getGlobalAiQuotaStatus({
    isEnabledOverride: isEnabled,
  });
  if (globalQuota.isExhausted) {
    return { ok: false, error: UI_STRINGS.ai.globalExhaustedNotice };
  }
  if (!globalQuota.isAvailable) {
    return {
      ok: false,
      error:
        "Layanan AI belum dikonfigurasi di server. Pastikan AI_API_KEY telah diatur.",
    };
  }

  try {
    const messages = buildTutorChatMessages({
      history: parsed.data.history,
      userMessage: parsed.data.message,
    });

    const completion = await callAiChatCompletion({ messages });

    let updatedQuota: AiQuotaStatus | null = null;
    if (isParticipant) {
      updatedQuota = await consumeUserAiQuota({
        userId: auth.user.id,
        tokensUsed: completion.totalTokens,
        feature: "ask_ai",
      });
    }

    return {
      ok: true,
      data: {
        reply: completion.content,
        tokensUsed: completion.totalTokens,
        quota: updatedQuota,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal memproses pesan chat AI saat ini.";
    return { ok: false, error: message };
  }
}


