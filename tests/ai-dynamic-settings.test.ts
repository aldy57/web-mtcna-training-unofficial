import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aiDynamicSettingsInputSchema } from "@/lib/ai/ai-config";
import {
  clearDynamicAiSettingsCache,
  getActiveAiModels,
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
      available_models: null,
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
    // 5 November 2026 jam 18:05 UTC+7 (11:05 UTC)
    const date1 = new Date("2026-11-05T11:05:00.000Z");
    assert.equal(formatAppDateTime(date1), "05/11/26 18:05");

    // Tanggal 9 Januari 2027 jam 09:02 UTC+7 (02:02 UTC)
    const date2 = new Date("2027-01-09T02:02:00.000Z");
    assert.equal(formatAppDateTime(date2), "09/01/27 09:02");

    // Null atau undefined
    assert.equal(formatAppDateTime(null), "—");
    assert.equal(formatAppDateTime(undefined), "—");
    assert.equal(formatAppDateTime("invalid-date"), "—");
  });

  it("memvalidasi dan mengelola daftar model AI kustom untuk peserta", () => {
    const validWithModels = aiDynamicSettingsInputSchema.safeParse({
      baseUrl: "https://router.ryzumi.net/v1",
      model: "gpt-6-luna",
      userTokenBudget: 50000,
      quotaResetDays: 1,
      availableModels: [
        {
          id: "gpt-6-luna",
          name: "MIRA Standar",
          description: "Cepat & seimbang",
          isActive: true,
          isDefault: true,
        },
        {
          id: "deepseek-chat",
          name: "MIRA Troubleshooting",
          description: "Analisis mendalam",
          isActive: true,
          isDefault: false,
        },
        {
          id: "qwen-2.5",
          name: "MIRA Fundamental",
          isActive: false,
        },
      ],
    });
    assert.equal(validWithModels.success, true);
    if (validWithModels.success) {
      assert.equal(validWithModels.data.availableModels?.length, 3);
    }

    // Resolusi konfigurasi dengan model kustom
    const resolved = resolveEffectiveAiConfig({
      model: "gpt-6-luna",
      available_models: validWithModels.success
        ? validWithModels.data.availableModels
        : [],
    });
    assert.equal(resolved.availableModels.length, 3);

    // Filter hanya model yang aktif
    const activeOnly = getActiveAiModels(resolved);
    assert.equal(activeOnly.length, 2);
    assert.equal(activeOnly[0].name, "MIRA Standar");
    assert.equal(activeOnly[1].name, "MIRA Troubleshooting");
  });

  it("menyediakan fallback model otomatis jika database belum memiliki daftar model", () => {
    const resolved = resolveEffectiveAiConfig({
      model: "gpt-6-luna",
      available_models: [],
    });
    assert.equal(resolved.availableModels.length, 1);
    assert.equal(resolved.availableModels[0].id, "gpt-6-luna");
    assert.equal(resolved.availableModels[0].isActive, true);

    const activeOnly = getActiveAiModels(resolved);
    assert.equal(activeOnly.length, 1);
  });
});

