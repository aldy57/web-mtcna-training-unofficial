import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminQuotaAdjustmentSchema,
  aiExplanationInputSchema,
  askAiInputSchema,
  getAiServerConfig,
  hasAiServerConfig,
} from "@/lib/ai/ai-config";
import {
  callAiChatCompletion,
  parseChatCompletionPayload,
} from "@/lib/ai/client";
import { clearMemoryExplanationCache } from "@/lib/ai/explanation-cache";
import {
  answerParticipantQuestion,
  generatePersonalExplanation,
  getOrGenerateGeneralExplanation,
} from "@/lib/ai/explanation-service";
import {
  clearMemoryRecommendationCache,
  getOrGenerateAiRecommendation,
} from "@/lib/ai/recommendation-service";
import {
  clearGlobalQuotaCache,
  evaluateGlobalQuotaStatus,
  getGlobalAiQuotaStatus,
  parseRemoteQuotaPayload,
} from "@/lib/ai/global-quota";
import {
  applyAdminQuotaAdjustment,
  applyTokenUsageToQuota,
  calculatePercentUsed,
  calculateQuotaStatus,
  shouldResetQuota,
} from "@/lib/ai/quota";

describe("lib/ai/quota — perhitungan kuota persentase & reset 1 hari", () => {
  it("menghitung persentase pemakaian dan sisa kuota secara akurat", () => {
    assert.equal(calculatePercentUsed(0, 30000), 0);
    assert.equal(calculatePercentUsed(7500, 30000), 25);
    assert.equal(calculatePercentUsed(15000, 30000), 50);
    assert.equal(calculatePercentUsed(30000, 30000), 100);
    assert.equal(calculatePercentUsed(45000, 30000), 100);

    const status = calculateQuotaStatus({
      userId: "00000000-0000-4000-8000-000000000001",
      tokensUsed: 9000,
      periodStartedAt: "2026-11-01T00:00:00.000Z",
      resetAt: null,
      tokenBudget: 30000,
      nowIso: "2026-11-01T01:00:00.000Z",
    });

    assert.equal(status.usedPercent, 30);
    assert.equal(status.remainingPercent, 70);
    assert.equal(status.isExhausted, false);
    assert.equal(status.resetAt, null);
  });

  it("menetapkan jadwal reset_at tepat 1 hari saat kuota mencapai 0%", () => {
    const startIso = "2026-11-01T00:00:00.000Z";
    const exhaustedIso = "2026-11-01T10:00:00.000Z";

    const step1 = applyTokenUsageToQuota({
      currentTokensUsed: 0,
      periodStartedAt: startIso,
      resetAt: null,
      tokensToConsume: 1500,
      tokenBudget: 3000,
      resetDays: 1,
      nowIso: startIso,
    });

    assert.equal(step1.tokensUsed, 1500);
    assert.equal(step1.percentConsumed, 50);
    assert.equal(step1.resetAt, null);

    const step2 = applyTokenUsageToQuota({
      currentTokensUsed: step1.tokensUsed,
      periodStartedAt: step1.periodStartedAt,
      resetAt: step1.resetAt,
      tokensToConsume: 1800,
      tokenBudget: 3000,
      resetDays: 1,
      nowIso: exhaustedIso,
    });

    assert.equal(step2.tokensUsed, 3000);
    assert.equal(step2.resetAt, "2026-11-02T10:00:00.000Z");
  });

  it("membatasi reset_at warisan 3 hari agar tidak melebihi batas 1 hari", () => {
    const legacyResetIso = "2026-11-04T10:00:00.000Z"; // 3 hari ke depan
    const nowIso = "2026-11-01T10:00:00.000Z";

    const status = calculateQuotaStatus({
      userId: "00000000-0000-4000-8000-000000000001",
      tokensUsed: 3000,
      periodStartedAt: nowIso,
      resetAt: legacyResetIso,
      tokenBudget: 3000,
      resetDays: 1,
      nowIso,
    });

    assert.equal(status.isExhausted, true);
    // Otomatis di-clamp ke maksimal 1 hari dari now (2026-11-02T10:00:00.000Z)
    assert.equal(status.resetAt, "2026-11-02T10:00:00.000Z");
  });

  it("mereset kuota kembali ke 100% secara malas (lazy) setelah melewati 1 hari", () => {
    const resetAtIso = "2026-11-02T10:00:00.000Z";

    assert.equal(
      shouldResetQuota(resetAtIso, "2026-11-02T09:59:59.000Z"),
      false,
    );
    assert.equal(
      shouldResetQuota(resetAtIso, "2026-11-02T10:00:00.000Z"),
      true,
    );

    const beforeReset = calculateQuotaStatus({
      userId: "00000000-0000-4000-8000-000000000001",
      tokensUsed: 3000,
      periodStartedAt: "2026-11-01T10:00:00.000Z",
      resetAt: resetAtIso,
      tokenBudget: 3000,
      nowIso: "2026-11-01T12:00:00.000Z",
    });
    assert.equal(beforeReset.isExhausted, true);
    assert.equal(beforeReset.remainingPercent, 0);
    assert.equal(beforeReset.resetAt, resetAtIso);

    const afterReset = calculateQuotaStatus({
      userId: "00000000-0000-4000-8000-000000000001",
      tokensUsed: 3000,
      periodStartedAt: "2026-11-01T10:00:00.000Z",
      resetAt: resetAtIso,
      tokenBudget: 3000,
      nowIso: "2026-11-02T10:00:01.000Z",
    });
    assert.equal(afterReset.isExhausted, false);
    assert.equal(afterReset.remainingPercent, 100);
    assert.equal(afterReset.tokensUsed, 0);
    assert.equal(afterReset.resetAt, null);
  });

  it("mendukung reset dan penambahan kuota manual oleh admin", () => {
    const partial = applyAdminQuotaAdjustment({
      currentTokensUsed: 24000,
      periodStartedAt: "2026-11-01T00:00:00.000Z",
      tokenBudget: 30000,
      action: "add_percent",
      percentToAdd: 50,
      nowIso: "2026-11-02T00:00:00.000Z",
    });
    assert.equal(partial.tokensUsed, 9000);
    assert.equal(partial.resetAt, null);

    const fullReset = applyAdminQuotaAdjustment({
      currentTokensUsed: 30000,
      periodStartedAt: "2026-11-01T00:00:00.000Z",
      tokenBudget: 30000,
      action: "reset",
      nowIso: "2026-11-02T00:00:00.000Z",
    });
    assert.equal(fullReset.tokensUsed, 0);
    assert.equal(fullReset.resetAt, null);
  });
});

describe("lib/ai/global-quota & client — kuota global dan klien mock", () => {
  it("mem-parsing berbagai format respons GET /v1/quota dan mendeteksi peringatan < 10%", () => {
    const metrics50M = parseRemoteQuotaPayload({
      total: 50_000_000,
      used: 49_000_000,
      remaining: 1_000_000,
    });
    assert.equal(metrics50M.remainingPercent, 2);
    assert.equal(metrics50M.usedPercent, 98);
    assert.equal(metrics50M.totalTokens, 50_000_000);
    assert.equal(metrics50M.usedTokens, 49_000_000);
    assert.equal(metrics50M.remainingTokens, 1_000_000);
    assert.equal(metrics50M.isExhausted, false);

    const statusLow = evaluateGlobalQuotaStatus({
      isEnabled: true,
      isConfigured: true,
      metrics: metrics50M,
      source: "remote",
      checkedAt: "2026-11-05T00:00:00.000Z",
    });
    assert.equal(statusLow.isLowWarning, true);
    assert.equal(statusLow.isAvailable, true);
    assert.equal(statusLow.totalTokens, 50_000_000);
    assert.equal(statusLow.remainingTokens, 1_000_000);

    const exhaustedMetrics = parseRemoteQuotaPayload({
      data: { total_tokens: 50_000_000, remaining_tokens: 0 },
    });
    assert.equal(exhaustedMetrics.isExhausted, true);

    const statusExhausted = evaluateGlobalQuotaStatus({
      isEnabled: true,
      isConfigured: true,
      metrics: exhaustedMetrics,
      source: "remote",
      checkedAt: "2026-11-05T00:00:00.000Z",
    });
    assert.equal(statusExhausted.isAvailable, false);
  });

  it("menangani respons HTML SPA dari router.ryzumi.net /v1/quota dengan fallback transparan ke pencatatan platform", async () => {
    const mockEnv = {
      AI_API_KEY: "sk-test-mock-key-1234567890",
      AI_BASE_URL: "https://router.ryzumi.net/v1",
      AI_MODEL: "deepseek-v4-flash",
      AI_TOTAL_PURCHASED_TOKENS: "50000000",
    };

    const mockFetchHtml: typeof fetch = async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/quota")) {
        return new Response(
          "<!doctype html><html lang='en'><head><title>Neko Router</title></head><body>SPA</body></html>",
          {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          },
        );
      }
      return new Response("{}", { status: 200 });
    };

    clearGlobalQuotaCache();
    const fallbackStatus = await getGlobalAiQuotaStatus({
      forceRefresh: true,
      envSource: mockEnv,
      fetchImpl: mockFetchHtml,
      isEnabledOverride: true,
    });

    assert.equal(fallbackStatus.source, "fallback");
    assert.equal(fallbackStatus.totalTokens, 50_000_000);
    assert.ok(
      typeof fallbackStatus.remainingTokens === "number" &&
        fallbackStatus.remainingTokens > 0,
    );
    assert.ok(
      typeof fallbackStatus.remainingPercent === "number" &&
        fallbackStatus.remainingPercent > 90,
    );
    assert.ok(fallbackStatus.responseNote?.includes("HTML"));
  });

  it("memanggil chat completions dan quota endpoint dengan mock tanpa menghabiskan token asli", async () => {
    const mockEnv = {
      AI_API_KEY: "sk-test-mock-key-1234567890",
      AI_BASE_URL: "https://router.ryzumi.net/v1",
      AI_MODEL: "deepseek-v4-flash",
      AI_USER_TOKEN_BUDGET: "3000",
      AI_QUOTA_RESET_DAYS: "3",
    };

    assert.equal(hasAiServerConfig(mockEnv), true);
    const cfg = getAiServerConfig(mockEnv);
    assert.equal(cfg.userTokenBudget, 3000);

    const mockFetch: typeof fetch = async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/quota")) {
        return new Response(
          JSON.stringify({
            total: 50_000_000,
            remaining: 15_000_000,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          model: "deepseek-v4-flash",
          choices: [
            {
              message: {
                content: "Penjelasan konsep MikroTik RouterOS.",
              },
            },
          ],
          usage: {
            prompt_tokens: 180,
            completion_tokens: 220,
            total_tokens: 400,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    clearGlobalQuotaCache();
    const globalStatus = await getGlobalAiQuotaStatus({
      forceRefresh: true,
      envSource: mockEnv,
      fetchImpl: mockFetch,
      isEnabledOverride: true,
    });
    assert.equal(globalStatus.remainingPercent, 30);
    assert.equal(globalStatus.isLowWarning, false);
    assert.equal(globalStatus.isAvailable, true);

    const completion = await callAiChatCompletion(
      {
        messages: [{ role: "user", content: "Apa fungsi NAT masquerade?" }],
      },
      { envSource: mockEnv, fetchImpl: mockFetch },
    );
    assert.equal(completion.totalTokens, 400);
    assert.equal(completion.content, "Penjelasan konsep MikroTik RouterOS.");

    const fallbackParsed = parseChatCompletionPayload(
      {
        choices: [{ message: { content: "Jawaban tanpa usage field." } }],
      },
      "deepseek-v4-flash",
    );
    assert.equal(fallbackParsed.totalTokens, 600);
  });

  it("memvalidasi skema input AI dengan zod", () => {
    const validAsk = askAiInputSchema.safeParse({
      attemptId: "00000000-0000-4000-8000-000000000001",
      questionId: "A01",
      language: "id",
      prompt: "Mengapa chain srcnat memakai action masquerade?",
    });
    assert.equal(validAsk.success, true);

    const longPromptAllowed = askAiInputSchema.safeParse({
      attemptId: "00000000-0000-4000-8000-000000000001",
      questionId: "A01",
      language: "id",
      prompt: "x".repeat(600),
    });
    assert.equal(longPromptAllowed.success, true);

    const emptyPrompt = askAiInputSchema.safeParse({
      attemptId: "00000000-0000-4000-8000-000000000001",
      questionId: "A01",
      language: "id",
      prompt: "   ",
    });
    assert.equal(emptyPrompt.success, false);

    const shortPromptValid = askAiInputSchema.safeParse({
      attemptId: "00000000-0000-4000-8000-000000000001",
      questionId: "A01",
      language: "id",
      prompt: "NAT?",
    });
    assert.equal(shortPromptValid.success, true);

    const invalidQuestionId = aiExplanationInputSchema.safeParse({
      attemptId: "00000000-0000-4000-8000-000000000001",
      questionId: "Z99",
      language: "id",
    });
    assert.equal(invalidQuestionId.success, false);

    const validAdminAdjust = adminQuotaAdjustmentSchema.safeParse({
      targetUserId: "00000000-0000-4000-8000-000000000002",
      action: "add_percent",
      percentToAdd: 25,
    });
    assert.equal(validAdminAdjust.success, true);
  });

  it("menyimpan penjelasan umum ke cache sehingga panggilan kedua tidak memanggil AI lagi", async () => {
    clearMemoryExplanationCache();

    const mockEnv = {
      AI_API_KEY: "sk-test-mock-key-1234567890",
      AI_BASE_URL: "https://router.ryzumi.net/v1",
      AI_MODEL: "deepseek-v4-flash",
    };

    let networkCalls = 0;
    const mockFetch: typeof fetch = async () => {
      networkCalls += 1;
      return new Response(
        JSON.stringify({
          model: "deepseek-v4-flash",
          choices: [
            {
              message: {
                content:
                  "Penjelasan ter-cache untuk soal A01 di RouterOS (/ip address add).",
              },
            },
          ],
          usage: { total_tokens: 320 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const sampleQuestion = {
      id: "A01",
      topic: "Dasar" as const,
      kind: "tunggal" as const,
      sortOrder: 1,
      body: "Perintah manakah untuk menambahkan IP address di RouterOS?",
      options: {
        A: "/ip address add",
        B: "/ip route add",
        C: "/interface set",
        D: "/system identity set",
      },
      answerKey: "A",
      explanation: "Gunakan menu /ip address add untuk menambahkan IP.",
      sources: [],
    };

    const firstCall = await getOrGenerateGeneralExplanation(
      sampleQuestion,
      "id",
      { envSource: mockEnv, fetchImpl: mockFetch },
    );
    assert.equal(firstCall.fromCache, false);
    assert.equal(networkCalls, 1);

    const secondCall = await getOrGenerateGeneralExplanation(
      sampleQuestion,
      "id",
      { envSource: mockEnv, fetchImpl: mockFetch },
    );
    assert.equal(secondCall.fromCache, true);
    assert.equal(secondCall.content, firstCall.content);
    assert.equal(networkCalls, 1);
  });

  it("membuat rekomendasi belajar AI sekali per attempt tanpa memanggil ulang saat dibuka kembali", async () => {
    clearMemoryRecommendationCache();

    const mockEnv = {
      AI_API_KEY: "sk-test-mock-key-1234567890",
      AI_BASE_URL: "https://router.ryzumi.net/v1",
      AI_MODEL: "deepseek-v4-flash",
    };

    let networkCalls = 0;
    const mockFetch: typeof fetch = async () => {
      networkCalls += 1;
      return new Response(
        JSON.stringify({
          model: "deepseek-v4-flash",
          choices: [
            {
              message: {
                content:
                  "Prioritas belajar: perdalam Firewall & NAT serta Routing statis.",
              },
            },
          ],
          usage: { total_tokens: 450 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const sampleSummary = {
      attemptId: "00000000-0000-4000-8000-000000000099",
      mode: "tryout" as const,
      language: "id" as const,
      totalQuestions: 50,
      correctCount: 28,
      wrongCount: 20,
      blankCount: 2,
      scorePercent: 56,
      hasPassed: false,
      isExpired: false,
      topicBreakdown: [
        {
          topic: "Firewall" as const,
          topicLabel: "Firewall dan NAT",
          correctCount: 2,
          totalCount: 8,
          scorePercent: 25,
        },
      ],
      weakestTopics: [
        {
          topic: "Firewall" as const,
          topicLabel: "Firewall dan NAT",
          correctCount: 2,
          totalCount: 8,
          scorePercent: 25,
        },
      ],
    };

    const firstRec = await getOrGenerateAiRecommendation({
      attemptId: sampleSummary.attemptId,
      userId: "00000000-0000-4000-8000-000000000001",
      language: "id",
      summary: sampleSummary,
      options: { envSource: mockEnv, fetchImpl: mockFetch },
    });
    assert.equal(firstRec.fromSaved, false);
    assert.equal(firstRec.tokensUsed, 450);
    assert.equal(networkCalls, 1);

    const secondRec = await getOrGenerateAiRecommendation({
      attemptId: sampleSummary.attemptId,
      userId: "00000000-0000-4000-8000-000000000001",
      language: "id",
      summary: sampleSummary,
      options: { envSource: mockEnv, fetchImpl: mockFetch },
    });
    assert.equal(secondRec.fromSaved, true);
    assert.equal(secondRec.tokensUsed, 0);
    assert.equal(secondRec.content, firstRec.content);
    assert.equal(networkCalls, 1);
  });

  it("menjalankan penjelasan personal jawaban dan Tanya AI serta mengembalikan jumlah token terpakai", async () => {
    const mockEnv = {
      AI_API_KEY: "sk-test-mock-key-1234567890",
      AI_BASE_URL: "https://router.ryzumi.net/v1",
      AI_MODEL: "deepseek-v4-flash",
    };

    const mockFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({
          model: "deepseek-v4-flash",
          choices: [
            {
              message: {
                content:
                  "Pilihan B salah karena /ip route add digunakan untuk routing, bukan memberi IP pada interface.",
              },
            },
          ],
          usage: { total_tokens: 280 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const sampleQuestion = {
      id: "A01",
      topic: "Dasar" as const,
      kind: "tunggal" as const,
      sortOrder: 1,
      body: "Perintah manakah untuk menambahkan IP address di RouterOS?",
      options: {
        A: "/ip address add",
        B: "/ip route add",
        C: "/interface set",
        D: "/system identity set",
      },
      answerKey: "A",
      explanation: "Gunakan menu /ip address add untuk menambahkan IP.",
      sources: [],
    };

    const personal = await generatePersonalExplanation({
      question: sampleQuestion,
      selectedOptions: ["B"],
      language: "id",
      options: { envSource: mockEnv, fetchImpl: mockFetch },
    });
    assert.equal(personal.tokensUsed, 280);
    assert.ok(personal.content.includes("/ip route add"));

    const askRes = await answerParticipantQuestion({
      question: sampleQuestion,
      participantPrompt:
        "Apakah parameter interface wajib disertakan saat menjalankan perintah /ip address add di CLI?",
      options: { envSource: mockEnv, fetchImpl: mockFetch },
    });
    assert.equal(askRes.tokensUsed, 280);
    assert.ok(askRes.content.length > 0);
  });
});




