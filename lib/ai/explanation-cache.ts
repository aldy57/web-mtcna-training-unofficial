import "server-only";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AiExplanationRecord, Language } from "@/lib/types";

interface DbExplanationRow {
  question_id: string;
  lang: Language;
  content: string;
  model: string;
  created_at: string;
}

const memoryExplanationCache = new Map<string, AiExplanationRecord>();

function buildCacheKey(questionId: string, language: Language): string {
  return `${questionId}:${language}`;
}

export function clearMemoryExplanationCache(): void {
  memoryExplanationCache.clear();
}

export async function getCachedAiExplanation(
  questionId: string,
  language: Language,
): Promise<AiExplanationRecord | null> {
  const cacheKey = buildCacheKey(questionId, language);
  const inMemory = memoryExplanationCache.get(cacheKey);
  if (inMemory) {
    return inMemory;
  }

  if (!hasSupabasePublicEnv()) {
    return null;
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("ai_explanations")
      .select("question_id, lang, content, model, created_at")
      .eq("question_id", questionId)
      .eq("lang", language)
      .maybeSingle<DbExplanationRow>();

    if (error || !data) {
      return null;
    }

    const record: AiExplanationRecord = {
      questionId: data.question_id,
      language: data.lang,
      content: data.content,
      createdAt: data.created_at,
    };

    memoryExplanationCache.set(cacheKey, record);
    return record;
  } catch {
    return null;
  }
}

export async function saveCachedAiExplanation(params: {
  questionId: string;
  language: Language;
  content: string;
  model?: string;
}): Promise<AiExplanationRecord> {
  const nowIso = new Date().toISOString();
  const record: AiExplanationRecord = {
    questionId: params.questionId,
    language: params.language,
    content: params.content,
    createdAt: nowIso,
  };

  const cacheKey = buildCacheKey(params.questionId, params.language);
  memoryExplanationCache.set(cacheKey, record);

  if (!hasSupabasePublicEnv()) {
    return record;
  }

  try {
    const admin = createSupabaseAdminClient();
    await admin.from("ai_explanations").upsert(
      {
        question_id: params.questionId,
        lang: params.language,
        content: params.content,
        model: params.model ?? "",
        created_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "question_id,lang" },
    );
  } catch {
    // Tetap kembalikan cache memori jika tabel belum dimigrasikan
  }

  return record;
}

export async function deleteCachedAiExplanationsForQuestion(
  questionId: string,
): Promise<void> {
  memoryExplanationCache.delete(buildCacheKey(questionId, "id"));
  memoryExplanationCache.delete(buildCacheKey(questionId, "en"));

  if (!hasSupabasePublicEnv()) {
    return;
  }

  try {
    const admin = createSupabaseAdminClient();
    await admin.from("ai_explanations").delete().eq("question_id", questionId);
  } catch {
    // Abaikan jika tabel belum tersedia
  }
}

