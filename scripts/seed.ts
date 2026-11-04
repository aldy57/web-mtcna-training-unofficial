import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import type { QuestionBankData } from "../lib/types.ts";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const QUESTIONS_JSON_PATH = resolve(process.cwd(), "data/questions.json");

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("your-") || value.includes("your-project-id")) {
    throw new Error(
      `Variabel environment ${name} belum diisi dengan benar di .env.local.`,
    );
  }
  return value;
}

async function seedQuestionBank(): Promise<void> {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const bankData = JSON.parse(
    readFileSync(QUESTIONS_JSON_PATH, "utf8"),
  ) as QuestionBankData;

  const refRows = Object.values(bankData.references).map((ref) => ({
    id: ref.id,
    title: ref.title,
    url: ref.url,
  }));

  const { error: refError } = await supabase
    .from("refs")
    .upsert(refRows, { onConflict: "id" });
  if (refError) {
    throw new Error(`Gagal seed tabel refs: ${refError.message}`);
  }

  const questionRows = bankData.questions.map((question) => ({
    id: question.id,
    topic: question.topic,
    kind: question.kind,
    sort_order: question.sortOrder,
    source_ids: question.sourceIds,
  }));

  const { error: questionError } = await supabase
    .from("questions")
    .upsert(questionRows, { onConflict: "id" });
  if (questionError) {
    throw new Error(`Gagal seed tabel questions: ${questionError.message}`);
  }

  const translationRows = bankData.questions.flatMap((question) => [
    {
      question_id: question.id,
      lang: "id",
      body: question.translations.id.body,
      options: question.translations.id.options,
      explanation: question.translations.id.explanation,
    },
    {
      question_id: question.id,
      lang: "en",
      body: question.translations.en.body,
      options: question.translations.en.options,
      explanation: question.translations.en.explanation,
    },
  ]);

  const { error: translationError } = await supabase
    .from("question_translations")
    .upsert(translationRows, { onConflict: "question_id,lang" });
  if (translationError) {
    throw new Error(
      `Gagal seed tabel question_translations: ${translationError.message}`,
    );
  }

  const keyRows = bankData.questions.map((question) => ({
    question_id: question.id,
    answer: question.answerKey,
  }));

  const { error: keyError } = await supabase
    .from("question_keys")
    .upsert(keyRows, { onConflict: "question_id" });
  if (keyError) {
    throw new Error(`Gagal seed tabel question_keys: ${keyError.message}`);
  }

  process.stdout.write(
    `Seed selesai: ${questionRows.length} soal, ${translationRows.length} terjemahan, ${keyRows.length} kunci, dan ${refRows.length} referensi berhasil disimpan.\n`,
  );
}

seedQuestionBank().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error seed: ${message}\n`);
  process.exit(1);
});

