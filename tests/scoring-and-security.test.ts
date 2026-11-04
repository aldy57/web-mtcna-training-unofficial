import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateScorePercent,
  evaluateQuizAttempt,
  findIncorrectOrBlankQuestionIds,
  formatScorePercent,
  hasPassedTryout,
  isAnswerCorrect,
  isDeadlineExpired,
  normalizeOptionList,
} from "../lib/scoring.ts";
import {
  canRoleTakeQuiz,
  registerSchema,
  upsertQuestionSchema,
  validateAnswerKeyForKind,
  verifyAdminTargetModification,
} from "../lib/validation.ts";

describe("lib/scoring", () => {
  it("normalizes and sorts option lists correctly", () => {
    assert.deepEqual(normalizeOptionList(["d", "A", "b", "A", "X"]), [
      "A",
      "B",
      "D",
    ]);
  });

  it("grades single-choice (tunggal) questions accurately", () => {
    assert.equal(isAnswerCorrect(["B"], "B"), true);
    assert.equal(isAnswerCorrect(["A"], "B"), false);
    assert.equal(isAnswerCorrect([], "B"), false);
    assert.equal(isAnswerCorrect(["A", "B"], "B"), false);
  });

  it("grades multiple-choice (jamak) questions with exact-match rule", () => {
    assert.equal(isAnswerCorrect(["D", "A", "B"], "ABD"), true);
    assert.equal(isAnswerCorrect(["A", "B"], "ABD"), false);
    assert.equal(isAnswerCorrect(["A", "B", "C", "D"], "ABD"), false);
  });

  it("enforces 60% passing threshold for tryout", () => {
    assert.equal(calculateScorePercent(30, 50), 60);
    assert.equal(hasPassedTryout(60), true);
    assert.equal(calculateScorePercent(29, 50), 58);
    assert.equal(hasPassedTryout(58), false);
  });

  it("formats integer and decimal percentages with Indonesian comma", () => {
    assert.equal(formatScorePercent(80), "80");
    assert.equal(formatScorePercent(66.666), "66,7");
  });

  it("evaluates an attempt, topic breakdown, weakest topics, and remedial list", () => {
    const sampleQuestions = [
      { id: "A01", topic: "Dasar" as const, answerKey: "B" },
      { id: "A02", topic: "Dasar" as const, answerKey: "C" },
      { id: "A06", topic: "DHCP" as const, answerKey: "ABD" },
      { id: "A08", topic: "Bridge" as const, answerKey: "C" },
    ];
    const answers = {
      A01: ["B"], // benar
      A02: ["A"], // salah
      A06: ["A", "B"], // kurang D -> salah
      // A08 kosong
    };

    const summary = evaluateQuizAttempt({
      attemptId: "attempt-1",
      mode: "tryout",
      language: "id",
      questions: sampleQuestions,
      answersByQuestionId: answers,
    });

    assert.equal(summary.totalQuestions, 4);
    assert.equal(summary.correctCount, 1);
    assert.equal(summary.wrongCount, 2);
    assert.equal(summary.blankCount, 1);
    assert.equal(summary.scorePercent, 25);
    assert.equal(summary.hasPassed, false);
    assert.equal(summary.weakestTopics.length, 3);

    const remedialIds = findIncorrectOrBlankQuestionIds(
      sampleQuestions,
      answers,
    );
    assert.deepEqual(remedialIds, ["A02", "A06", "A08"]);
  });

  it("detects expired deadlines accurately", () => {
    const now = new Date("2026-11-04T12:00:00Z");
    assert.equal(isDeadlineExpired("2026-11-04T11:59:59Z", now), true);
    assert.equal(isDeadlineExpired("2026-11-04T12:00:00Z", now), true);
    assert.equal(isDeadlineExpired("2026-11-04T12:00:01Z", now), false);
    assert.equal(isDeadlineExpired(null, now), false);
  });
});

describe("lib/validation and security rules", () => {
  it("prevents admin from deleting or resetting password of another admin", () => {
    const deleteAdminResult = verifyAdminTargetModification({
      actorRole: "admin",
      targetRole: "admin",
      operation: "delete_account",
    });
    assert.equal(deleteAdminResult.allowed, false);

    const resetAdminResult = verifyAdminTargetModification({
      actorRole: "admin",
      targetRole: "admin",
      operation: "reset_password",
    });
    assert.equal(resetAdminResult.allowed, false);
  });

  it("allows admin to delete or reset password of participant (user role)", () => {
    const deleteUserResult = verifyAdminTargetModification({
      actorRole: "admin",
      targetRole: "user",
      operation: "delete_account",
    });
    assert.equal(deleteUserResult.allowed, true);

    const resetUserResult = verifyAdminTargetModification({
      actorRole: "admin",
      targetRole: "user",
      operation: "reset_password",
    });
    assert.equal(resetUserResult.allowed, true);
  });

  it("rejects non-admin actor from account management", () => {
    const result = verifyAdminTargetModification({
      actorRole: "user",
      targetRole: "user",
      operation: "delete_account",
    });
    assert.equal(result.allowed, false);
  });

  it("blocks admin role from taking study or tryout quizzes", () => {
    assert.equal(canRoleTakeQuiz("user"), true);
    assert.equal(canRoleTakeQuiz("admin"), false);
  });

  it("validates answer key against question kind (tunggal vs jamak)", () => {
    assert.equal(validateAnswerKeyForKind("tunggal", "B"), null);
    assert.notEqual(validateAnswerKeyForKind("tunggal", "AB"), null);
    assert.equal(validateAnswerKeyForKind("jamak", "ABD"), null);
    assert.notEqual(validateAnswerKeyForKind("jamak", "A"), null);
    assert.notEqual(validateAnswerKeyForKind("jamak", "AA"), null);
  });

  it("validates register schema password confirmation", () => {
    const mismatch = registerSchema.safeParse({
      fullName: "Budi Santoso",
      email: "budi@example.com",
      password: "password123",
      confirmPassword: "password999",
    });
    assert.equal(mismatch.success, false);

    const valid = registerSchema.safeParse({
      fullName: "Budi Santoso",
      email: "budi@example.com",
      password: "password123",
      confirmPassword: "password123",
    });
    assert.equal(valid.success, true);
  });

  it("rejects invalid question upsert payload when kind and answerKey conflict", () => {
    const parsed = upsertQuestionSchema.safeParse({
      id: "A99",
      topic: "Dasar",
      kind: "tunggal",
      sortOrder: 51,
      answerKey: "AB",
      sourceIds: "S03",
      bodyId: "Pertanyaan contoh dalam bahasa Indonesia?",
      optionsId: { A: "Satu", B: "Dua", C: "Tiga", D: "Empat" },
      explanationId: "Penjelasan contoh bahasa Indonesia.",
      bodyEn: "Sample question in English language?",
      optionsEn: { A: "One", B: "Two", C: "Three", D: "Four" },
      explanationEn: "Sample explanation in English.",
    });
    assert.equal(parsed.success, false);
  });
});

