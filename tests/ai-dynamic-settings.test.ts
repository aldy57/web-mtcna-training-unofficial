import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aiDynamicSettingsInputSchema } from "@/lib/ai/ai-config";
import {
  clearDynamicAiSettingsCache,
  getCachedDynamicAiOverrides,
  resolveEffectiveAiConfig,
  setCachedDynamicAiSettings,
} from "@/lib/ai/dynamic-settings";
import { formatAppDateTime } from "@/lib/format-date";

describe("lib/ai — Pengaturan Konfigurasi AI Dinamis (Admin)", () => {
  it("memvalidasi skema input pengaturan AI dari admin dengan zod", () => {
    // Valid input
    const valid = aiDynamicSettingsInputSchema.safeParse({
      baseUrl: "https://router.ryzumi.net/v1",
      model: "deepseek-chat",
      userTokenBudget: 100000,
      quotaResetDays: 1,
    });
    assert.equal(valid.success, true);
    if (valid.success) {
      assert.equal(valid.data.model, "deepseek-chat");
      assert.equal(valid.data.userTokenBudget, 100000);
      assert.equal(valid.data.quotaResetDays, 1);
    }

    // Invalid: Base URL bukan format URL
    const invalidUrl = aiDynamicSettingsInputSchema.safeParse({
      baseUrl: "bukan-sebuah-url",
      model: "deepseek-chat",
      userTokenBudget: 100000,
      quotaResetDays: 1,
    });
    assert.equal(invalidUrl.success, false);

    // Invalid: Model kosong
    const emptyModel = aiDynamicSettingsInputSchema.safeParse({
      baseUrl: "https://router.ryzumi.net/v1",
      model: "   ",
      userTokenBudget: 100000,
      quotaResetDays: 1,
    });
    assert.equal(emptyModel.success, false);

    // Invalid: Token budget di bawah 500
    const lowBudget = aiDynamicSettingsInputSchema.safeParse({
      baseUrl: "https://router.ryzumi.net/v1",
      model: "deepseek-chat",
      userTokenBudget: 200,
      quotaResetDays: 1,
    });
    assert.equal(lowBudget.success, false);

    // Invalid: Token budget di atas 10 juta
    const highBudget = aiDynamicSettingsInputSchema.safeParse({
      baseUrl: "https://router.ryzumi.net/v1",
      model: "deepseek-chat",
      userTokenBudget: 15_000_000,
      quotaResetDays: 1,
    });
    assert.equal(highBudget.success, false);

    // Invalid: Reset days di bawah 1 atau di atas 30
    const invalidDays = aiDynamicSettingsInputSchema.safeParse({
      baseUrl: "https://router.ryzumi.net/v1",
      model: "deepseek-chat",
      userTokenBudget: 50000,
      quotaResetDays: 0,
    });
    assert.equal(invalidDays.success, false);
  });

  it("menyelesaikan konfigurasi efektif dengan fallback ke .env saat database kosong", () => {
    const mockEnv = {
      AI_BASE_URL: "https://router.ryzumi.net/v1",
      AI_MODEL: "deepseek-v4-flash",
      AI_USER_TOKEN_BUDGET: "30000",
      AI_QUOTA_RESET_DAYS: "1",
    };

    // Saat database null, fallback ke mockEnv
    const resolved = resolveEffectiveAiConfig(null, mockEnv);
    assert.equal(resolved.baseUrl, "https://router.ryzumi.net/v1");
    assert.equal(resolved.model, "deepseek-v4-flash");
    assert.equal(resolved.userTokenBudget, 30000);
    assert.equal(resolved.quotaResetDays, 1);
    assert.equal(resolved.isCustomized, false);
  });

  it("memprioritaskan nilai kustom dari database dibanding .env saat telah diatur admin", () => {
    const mockEnv = {
      AI_BASE_URL: "https://router.ryzumi.net/v1",
      AI_MODEL: "deepseek-v4-flash",
      AI_USER_TOKEN_BUDGET: "30000",
      AI_QUOTA_RESET_DAYS: "1",
    };

    const customRow = {
      base_url: "https://api.openai.com/v1/",
      model: "gpt-4o-mini",
      user_token_budget: 100000,
      quota_reset_days: 3,
      updated_at: "2026-11-05T10:00:00.000Z",
      updated_by: "admin-uuid-123",
    };

    const resolved = resolveEffectiveAiConfig(customRow, mockEnv);
    // Trailing slash otomatis dipotong
    assert.equal(resolved.baseUrl, "https://api.openai.com/v1");
    assert.equal(resolved.model, "gpt-4o-mini");
    assert.equal(resolved.userTokenBudget, 100000);
    assert.equal(resolved.quotaResetDays, 3);
    assert.equal(resolved.isCustomized, true);
    assert.equal(resolved.updatedAt, "2026-11-05T10:00:00.000Z");
  });

  it("mendukung pembersihan dan pengaturan cache dinamis in-memory", () => {
    clearDynamicAiSettingsCache();
    assert.equal(getCachedDynamicAiOverrides(), null);

    setCachedDynamicAiSettings({
      base_url: "https://router.ryzumi.net/v1",
      model: "deepseek-chat",
      user_token_budget: 80000,
      quota_reset_days: 2,
      updated_at: null,
      updated_by: null,
    });

    const cached = getCachedDynamicAiOverrides();
    assert.notEqual(cached, null);
    assert.equal(cached?.model, "deepseek-chat");
    assert.equal(cached?.user_token_budget, 80000);

    clearDynamicAiSettingsCache();
    assert.equal(getCachedDynamicAiOverrides(), null);
  });

  it("memformat tanggal dan waktu ke format dd/mm/yy 24h", () => {
    // 5 November 2026 jam 18:05 lokal
    const localDate = new Date(2026, 10, 5, 18, 5, 0);
    assert.equal(formatAppDateTime(localDate), "05/11/26 18:05");

    // Tanggal 9 Januari 2027 jam 09:02 lokal
    const singleDigitDate = new Date(2027, 0, 9, 9, 2, 0);
    assert.equal(formatAppDateTime(singleDigitDate), "09/01/27 09:02");

    // Null atau undefined
    assert.equal(formatAppDateTime(null), "—");
    assert.equal(formatAppDateTime(undefined), "—");
    assert.equal(formatAppDateTime("invalid-date"), "—");
  });
});

