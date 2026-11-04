import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { TRYOUT_QUESTION_COUNT } from "../lib/constants.ts";
import { TOPIC_KEYS, TRYOUT_QUESTION_IDS } from "../lib/topics.ts";
import type { QuestionBankData, QuestionPublic } from "../lib/types.ts";

const QUESTIONS_JSON_PATH = resolve(process.cwd(), "data/questions.json");

describe("Question Bank Data Integrity & DTO Security", () => {
  const bank = JSON.parse(
    readFileSync(QUESTIONS_JSON_PATH, "utf8"),
  ) as QuestionBankData;

  it("contains exactly 50 questions and 9 topics", () => {
    assert.equal(bank.questions.length, TRYOUT_QUESTION_COUNT);
    const topics = new Set(bank.questions.map((q) => q.topic));
    assert.equal(topics.size, TOPIC_KEYS.length);
  });

  it("has valid interleaved tryout order A01..B19", () => {
    assert.equal(bank.tryoutOrderIds.length, TRYOUT_QUESTION_COUNT);
    assert.deepEqual(bank.tryoutOrderIds, [...TRYOUT_QUESTION_IDS]);
  });

  it("never exposes answerKey or explanation when projecting to QuestionPublic", () => {
    const sample = bank.questions[0];
    assert.ok(sample);

    const publicDto: QuestionPublic = {
      id: sample.id,
      topic: sample.topic,
      kind: sample.kind,
      sortOrder: sample.sortOrder,
      body: sample.translations.id.body,
      options: sample.translations.id.options,
    };

    assert.equal("answerKey" in publicDto, false);
    assert.equal("explanation" in publicDto, false);
    assert.equal("sources" in publicDto, false);
  });
});

