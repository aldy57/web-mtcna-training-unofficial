import "server-only";
import fallbackBankJson from "@/data/questions.json";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TRYOUT_QUESTION_IDS, isValidTopicKey } from "@/lib/topics";
import type {
  Language,
  QuestionBankData,
  QuestionKind,
  QuestionOptions,
  QuestionPublic,
  QuestionRecord,
  QuestionWithSolution,
  ReferenceSource,
  TopicKey,
} from "@/lib/types";

const FALLBACK_BANK = fallbackBankJson as unknown as QuestionBankData;

interface DbQuestionRow {
  id: string;
  topic: string;
  kind: string;
  sort_order: number;
  source_ids: string[];
}

interface DbTranslationRow {
  question_id: string;
  lang: string;
  body: string;
  options: QuestionOptions;
  explanation: string;
}

interface DbKeyRow {
  question_id: string;
  answer: string;
}

interface DbRefRow {
  id: string;
  title: string;
  url: string;
}

export function toPublicQuestion(
  record: QuestionRecord,
  language: Language,
): QuestionPublic {
  const translation = record.translations[language] ?? record.translations.id;
  return {
    id: record.id,
    topic: record.topic,
    kind: record.kind,
    sortOrder: record.sortOrder,
    body: translation.body,
    options: translation.options,
  };
}

export function toQuestionWithSolution(
  record: QuestionRecord,
  language: Language,
  references: Readonly<Record<string, ReferenceSource>>,
): QuestionWithSolution {
  const publicQuestion = toPublicQuestion(record, language);
  const translation = record.translations[language] ?? record.translations.id;
  const sources = record.sourceIds
    .map((sourceId) => references[sourceId])
    .filter((ref): ref is ReferenceSource => Boolean(ref));

  return {
    ...publicQuestion,
    answerKey: record.answerKey,
    explanation: translation.explanation,
    sources,
  };
}

async function fetchQuestionBankFromDatabase(): Promise<{
  questions: QuestionRecord[];
  references: Record<string, ReferenceSource>;
} | null> {
  if (!hasSupabasePublicEnv()) {
    return null;
  }

  try {
    const adminClient = createSupabaseAdminClient();
    const [questionsRes, translationsRes, keysRes, refsRes] = await Promise.all([
      adminClient
        .from("questions")
        .select("id, topic, kind, sort_order, source_ids")
        .order("sort_order", { ascending: true }),
      adminClient
        .from("question_translations")
        .select("question_id, lang, body, options, explanation"),
      adminClient.from("question_keys").select("question_id, answer"),
      adminClient.from("refs").select("id, title, url"),
    ]);

    if (
      questionsRes.error ||
      translationsRes.error ||
      keysRes.error ||
      refsRes.error ||
      !questionsRes.data?.length
    ) {
      return null;
    }

    const references: Record<string, ReferenceSource> = {};
    for (const row of (refsRes.data ?? []) as DbRefRow[]) {
      references[row.id] = { id: row.id, title: row.title, url: row.url };
    }

    const keysByQuestionId = new Map<string, string>();
    for (const row of (keysRes.data ?? []) as DbKeyRow[]) {
      keysByQuestionId.set(row.question_id, row.answer);
    }

    const translationsByQuestion = new Map<
      string,
      Partial<Record<Language, DbTranslationRow>>
    >();
    for (const row of (translationsRes.data ?? []) as DbTranslationRow[]) {
      const lang = row.lang === "en" ? "en" : "id";
      const existing = translationsByQuestion.get(row.question_id) ?? {};
      existing[lang] = row;
      translationsByQuestion.set(row.question_id, existing);
    }

    const questions: QuestionRecord[] = [];
    for (const row of questionsRes.data as DbQuestionRow[]) {
      const translations = translationsByQuestion.get(row.id);
      const idTrans = translations?.id;
      const enTrans = translations?.en ?? idTrans;
      const answerKey = keysByQuestionId.get(row.id);

      if (!idTrans || !enTrans || !answerKey || !isValidTopicKey(row.topic)) {
        continue;
      }

      questions.push({
        id: row.id,
        topic: row.topic,
        kind: (row.kind === "jamak" ? "jamak" : "tunggal") as QuestionKind,
        sortOrder: row.sort_order,
        sourceIds: row.source_ids ?? [],
        answerKey,
        translations: {
          id: {
            body: idTrans.body,
            options: idTrans.options,
            explanation: idTrans.explanation,
          },
          en: {
            body: enTrans.body,
            options: enTrans.options,
            explanation: enTrans.explanation,
          },
        },
      });
    }

    if (questions.length === 0) {
      return null;
    }

    return { questions, references };
  } catch {
    return null;
  }
}

export async function getQuestionBank(): Promise<{
  questions: QuestionRecord[];
  references: Record<string, ReferenceSource>;
}> {
  const fromDb = await fetchQuestionBankFromDatabase();
  if (fromDb) {
    return fromDb;
  }
  return {
    questions: FALLBACK_BANK.questions,
    references: FALLBACK_BANK.references,
  };
}

export async function getQuestionRecordsByIds(
  questionIds: readonly string[],
): Promise<{
  questions: QuestionRecord[];
  references: Record<string, ReferenceSource>;
}> {
  const { questions, references } = await getQuestionBank();
  const byId = new Map(questions.map((question) => [question.id, question]));

  const orderedQuestions = questionIds
    .map((id) => byId.get(id))
    .filter((question): question is QuestionRecord => Boolean(question));

  return { questions: orderedQuestions, references };
}

export async function getQuestionIdsForTopic(topic: TopicKey): Promise<string[]> {
  const { questions } = await getQuestionBank();
  return questions
    .filter((question) => question.topic === topic)
    .sort((first, second) => first.id.localeCompare(second.id))
    .map((question) => question.id);
}

export async function getQuestionIdsForTryout(): Promise<string[]> {
  const { questions } = await getQuestionBank();
  const byId = new Set(questions.map((question) => question.id));
  const standardOrder = TRYOUT_QUESTION_IDS.filter((id) => byId.has(id));

  if (standardOrder.length > 0) {
    return standardOrder;
  }

  return questions
    .slice()
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((question) => question.id);
}

