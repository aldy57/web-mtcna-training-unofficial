import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  OPTION_KEYS,
  QUESTION_KINDS,
  TRYOUT_QUESTION_COUNT,
} from "../lib/constants.ts";
import {
  TOPIC_KEYS,
  TRYOUT_QUESTION_IDS,
  isValidTopicKey,
} from "../lib/topics.ts";
import type {
  OptionKey,
  QuestionBankData,
  QuestionKind,
  QuestionOptions,
  QuestionRecord,
  ReferenceSource,
} from "../lib/types.ts";

const LEGACY_HTML_PATH = resolve(
  process.cwd(),
  "docs/legacy/MTCNA_Tryout_Bilingual_50_Soal.html",
);
const OUTPUT_JSON_PATH = resolve(process.cwd(), "data/questions.json");

interface RawIndonesianQuestion {
  id: string;
  topik: string;
  jenis: string;
  soal: string;
  opsi: Record<string, string>;
  kunci: string;
  pembahasan: string;
  sumber: string;
}

interface RawEnglishTranslation {
  soal: string;
  opsi: Record<string, string>;
  pembahasan: string;
}

interface RawReferenceEntry {
  title: string;
  url: string;
}

function extractScriptJson<T>(html: string, scriptId: string): T {
  const pattern = new RegExp(
    `<script id="${scriptId}" type="application/json">([\\s\\S]*?)</script>`,
  );
  const match = html.match(pattern);
  if (!match || !match[1]) {
    throw new Error(`Tidak ditemukan blok <script id="${scriptId}"> di HTML.`);
  }
  return JSON.parse(match[1]) as T;
}

function buildExpectedIds(): Set<string> {
  const expected = new Set<string>();
  for (const prefix of ["A", "B"]) {
    for (let index = 1; index <= 25; index++) {
      expected.add(`${prefix}${String(index).padStart(2, "0")}`);
    }
  }
  return expected;
}

function validateOptions(
  questionId: string,
  language: string,
  rawOptions: Record<string, string>,
): QuestionOptions {
  const keys = Object.keys(rawOptions);
  if (keys.length !== OPTION_KEYS.length) {
    throw new Error(
      `Soal ${questionId} (${language}) harus memiliki 4 opsi, ditemukan ${keys.length}.`,
    );
  }
  for (const optionKey of OPTION_KEYS) {
    const value = rawOptions[optionKey];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(
        `Soal ${questionId} (${language}) kehilangan teks opsi ${optionKey}.`,
      );
    }
  }
  return {
    A: rawOptions.A.trim(),
    B: rawOptions.B.trim(),
    C: rawOptions.C.trim(),
    D: rawOptions.D.trim(),
  };
}

function normalizeAndValidateAnswerKey(
  questionId: string,
  kind: QuestionKind,
  rawKey: string,
): string {
  const characters = rawKey.trim().split("");
  const uniqueSorted = Array.from(new Set(characters)).sort();

  const isValidOptionList = uniqueSorted.every((char) =>
    OPTION_KEYS.includes(char as OptionKey),
  );
  if (!isValidOptionList || uniqueSorted.length !== characters.length) {
    throw new Error(`Kunci jawaban soal ${questionId} tidak valid: "${rawKey}".`);
  }

  if (kind === "tunggal" && uniqueSorted.length !== 1) {
    throw new Error(
      `Soal tunggal ${questionId} harus memiliki tepat 1 kunci, ditemukan "${rawKey}".`,
    );
  }
  if (kind === "jamak" && uniqueSorted.length < 2) {
    throw new Error(
      `Soal jamak ${questionId} harus memiliki minimal 2 kunci, ditemukan "${rawKey}".`,
    );
  }

  return uniqueSorted.join("");
}

function normalizeReferences(
  rawRefs: Record<string, RawReferenceEntry>,
): Record<string, ReferenceSource> {
  const references: Record<string, ReferenceSource> = {};
  for (const [id, entry] of Object.entries(rawRefs)) {
    if (!entry.title?.trim() || !entry.url?.trim()) {
      throw new Error(`Referensi ${id} tidak memiliki title atau url yang valid.`);
    }
    references[id] = {
      id,
      title: entry.title.trim(),
      url: entry.url.trim(),
    };
  }
  return references;
}

function buildQuestionRecords(
  rawBank: RawIndonesianQuestion[],
  rawEn: Record<string, RawEnglishTranslation>,
  references: Record<string, ReferenceSource>,
): QuestionRecord[] {
  if (rawBank.length !== TRYOUT_QUESTION_COUNT) {
    throw new Error(
      `Jumlah soal harus ${TRYOUT_QUESTION_COUNT}, ditemukan ${rawBank.length}.`,
    );
  }

  const expectedIds = buildExpectedIds();
  const seenIds = new Set<string>();
  const seenTopics = new Set<string>();

  const tryoutOrderPosition = new Map<string, number>(
    TRYOUT_QUESTION_IDS.map((id, index) => [id, index + 1]),
  );

  const records: QuestionRecord[] = rawBank.map((rawQuestion) => {
    const { id, topik, jenis } = rawQuestion;

    if (!expectedIds.has(id)) {
      throw new Error(`ID soal tidak dikenal: ${id}.`);
    }
    if (seenIds.has(id)) {
      throw new Error(`ID soal duplikat: ${id}.`);
    }
    seenIds.add(id);

    if (!isValidTopicKey(topik)) {
      throw new Error(`Topik tidak valid pada soal ${id}: "${topik}".`);
    }
    seenTopics.add(topik);

    if (!QUESTION_KINDS.includes(jenis as QuestionKind)) {
      throw new Error(`Jenis soal tidak valid pada soal ${id}: "${jenis}".`);
    }
    const kind = jenis as QuestionKind;

    const englishEntry = rawEn[id];
    if (!englishEntry) {
      throw new Error(`Terjemahan bahasa Inggris tidak ditemukan untuk soal ${id}.`);
    }

    const sourceIds = rawQuestion.sumber
      .split(",")
      .map((sourceId) => sourceId.trim())
      .filter(Boolean);

    if (sourceIds.length === 0) {
      throw new Error(`Soal ${id} tidak memiliki referensi sumber.`);
    }
    for (const sourceId of sourceIds) {
      if (!references[sourceId]) {
        throw new Error(
          `Soal ${id} merujuk ke sumber "${sourceId}" yang tidak ada di refs.`,
        );
      }
    }

    const sortOrder = tryoutOrderPosition.get(id);
    if (!sortOrder) {
      throw new Error(`Soal ${id} tidak memiliki posisi pada urutan tryout.`);
    }

    return {
      id,
      topic: topik,
      kind,
      sortOrder,
      sourceIds,
      answerKey: normalizeAndValidateAnswerKey(id, kind, rawQuestion.kunci),
      translations: {
        id: {
          body: rawQuestion.soal.trim(),
          options: validateOptions(id, "id", rawQuestion.opsi),
          explanation: rawQuestion.pembahasan.trim(),
        },
        en: {
          body: englishEntry.soal.trim(),
          options: validateOptions(id, "en", englishEntry.opsi),
          explanation: englishEntry.pembahasan.trim(),
        },
      },
    };
  });

  if (seenTopics.size !== TOPIC_KEYS.length) {
    throw new Error(
      `Jumlah topik harus ${TOPIC_KEYS.length}, ditemukan ${seenTopics.size}.`,
    );
  }

  return records;
}

function main(): void {
  const html = readFileSync(LEGACY_HTML_PATH, "utf8");
  const rawBank = extractScriptJson<RawIndonesianQuestion[]>(html, "bank");
  const rawEn = extractScriptJson<Record<string, RawEnglishTranslation>>(
    html,
    "bank-en",
  );
  const rawRefs = extractScriptJson<Record<string, RawReferenceEntry>>(
    html,
    "refs",
  );

  const references = normalizeReferences(rawRefs);
  const questions = buildQuestionRecords(rawBank, rawEn, references);

  const outputData: QuestionBankData = {
    version: 1,
    extractedAt: "2026-11-04T00:00:00.000Z",
    questionCount: questions.length,
    tryoutOrderIds: [...TRYOUT_QUESTION_IDS],
    references,
    questions,
  };

  mkdirSync(dirname(OUTPUT_JSON_PATH), { recursive: true });
  writeFileSync(OUTPUT_JSON_PATH, `${JSON.stringify(outputData, null, 2)}\n`, "utf8");

  process.stdout.write(
    `Ekstraksi berhasil: ${questions.length} soal, ${TOPIC_KEYS.length} topik, ${Object.keys(references).length} referensi -> data/questions.json\n`,
  );
}

main();

