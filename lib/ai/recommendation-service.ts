import "server-only";
import {
  callAiChatCompletion,
  type FetchLike,
} from "@/lib/ai/client";
import { buildRecommendationMessages } from "@/lib/ai/prompts";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AiRecommendationRecord,
  Language,
  QuizResultSummary,
} from "@/lib/types";

interface DbRecommendationRow {
  attempt_id: string;
  user_id: string;
  lang: Language;
  content: string;
  created_at: string;
}

const memoryRecommendationCache = new Map<string, AiRecommendationRecord>();

export function clearMemoryRecommendationCache(): void {
  memoryRecommendationCache.clear();
}

export async function getSavedAiRecommendation(
  attemptId: string,
): Promise<AiRecommendationRecord | null> {
  const inMemory = memoryRecommendationCache.get(attemptId);
  if (inMemory) {
    return inMemory;
  }

  if (!hasSupabasePublicEnv()) {
    return null;
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("ai_recommendations")
      .select("attempt_id, user_id, lang, content, created_at")
      .eq("attempt_id", attemptId)
      .maybeSingle<DbRecommendationRow>();

    if (error || !data) {
      return null;
    }

    const record: AiRecommendationRecord = {
      attemptId: data.attempt_id,
      userId: data.user_id,
      language: data.lang,
      content: data.content,
      createdAt: data.created_at,
    };

    memoryRecommendationCache.set(attemptId, record);
    return record;
  } catch {
    return null;
  }
}

export async function saveAiRecommendation(params: {
  attemptId: string;
  userId: string;
  language: Language;
  content: string;
}): Promise<AiRecommendationRecord> {
  const nowIso = new Date().toISOString();
  const record: AiRecommendationRecord = {
    attemptId: params.attemptId,
    userId: params.userId,
    language: params.language,
    content: params.content,
    createdAt: nowIso,
  };

  memoryRecommendationCache.set(params.attemptId, record);

  if (!hasSupabasePublicEnv()) {
    return record;
  }

  try {
    const admin = createSupabaseAdminClient();
    await admin.from("ai_recommendations").upsert(
      {
        attempt_id: params.attemptId,
        user_id: params.userId,
        lang: params.language,
        content: params.content,
        created_at: nowIso,
      },
      { onConflict: "attempt_id" },
    );
  } catch {
    // Tetap simpan di memori bila tabel belum tersedia
  }

  return record;
}

export interface RecommendationGenerationResult {
  content: string;
  fromSaved: boolean;
  tokensUsed: number;
}

export async function getOrGenerateAiRecommendation(params: {
  attemptId: string;
  userId: string;
  language: Language;
  summary: QuizResultSummary;
  options?: {
    envSource?: Record<string, string | undefined>;
    fetchImpl?: FetchLike;
  };
}): Promise<RecommendationGenerationResult> {
  const saved = await getSavedAiRecommendation(params.attemptId);
  if (saved) {
    return {
      content: saved.content,
      fromSaved: true,
      tokensUsed: 0,
    };
  }

  const messages = buildRecommendationMessages(params.summary);
  const completion = await callAiChatCompletion(
    { messages },
    params.options,
  );

  await saveAiRecommendation({
    attemptId: params.attemptId,
    userId: params.userId,
    language: params.language,
    content: completion.content,
  });

  return {
    content: completion.content,
    fromSaved: false,
    tokensUsed: completion.totalTokens,
  };
}

