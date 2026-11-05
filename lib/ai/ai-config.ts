import "server-only";
import { z } from "zod";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";

export const DEFAULT_AI_BASE_URL = "https://router.ryzumi.net/v1";
export const DEFAULT_AI_MODEL = "deepseek-v4-flash";
export const DEFAULT_AI_USER_TOKEN_BUDGET = 30000;
export const DEFAULT_AI_QUOTA_RESET_DAYS = 3;
export const DEFAULT_AI_TOTAL_PURCHASED_TOKENS = 50_000_000;

export const AI_MIN_QUESTION_CHARS = 5;
export const AI_MAX_COMPLETION_TOKENS = 700;
export const AI_REQUEST_TIMEOUT_MS = 25000;
export const AI_ESTIMATED_FALLBACK_TOKENS = 600;

export const GLOBAL_QUOTA_WARNING_PERCENT = 10;
export const GLOBAL_QUOTA_CACHE_TTL_MS = 5 * 60 * 1000;

const PLACEHOLDER_AI_KEY = "your-ryzumi-api-key";

const aiServerEnvSchema = z.object({
  apiKey: z
    .string()
    .min(10, { error: "AI_API_KEY belum diisi." })
    .refine((value) => value !== PLACEHOLDER_AI_KEY, {
      message: "AI_API_KEY masih menggunakan nilai placeholder.",
    }),
  baseUrl: z
    .url({ error: "AI_BASE_URL harus berupa URL yang valid." })
    .default(DEFAULT_AI_BASE_URL),
  model: z
    .string()
    .trim()
    .min(1, { error: "AI_MODEL tidak boleh kosong." })
    .default(DEFAULT_AI_MODEL),
  userTokenBudget: z.coerce
    .number()
    .int()
    .min(500, { error: "AI_USER_TOKEN_BUDGET minimal 500 token." })
    .max(10_000_000, { error: "AI_USER_TOKEN_BUDGET melebihi batas wajar." })
    .default(DEFAULT_AI_USER_TOKEN_BUDGET),
  quotaResetDays: z.coerce
    .number()
    .int()
    .min(1, { error: "AI_QUOTA_RESET_DAYS minimal 1 hari." })
    .max(30, { error: "AI_QUOTA_RESET_DAYS maksimal 30 hari." })
    .default(DEFAULT_AI_QUOTA_RESET_DAYS),
  totalPurchasedTokens: z.coerce
    .number()
    .int()
    .min(1000, { error: "AI_TOTAL_PURCHASED_TOKENS minimal 1000 token." })
    .default(DEFAULT_AI_TOTAL_PURCHASED_TOKENS),
});

export interface AiServerConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  userTokenBudget: number;
  quotaResetDays: number;
  totalPurchasedTokens: number;
}

export function getAiBudgetSettings(
  envSource: Record<string, string | undefined> = process.env,
): {
  userTokenBudget: number;
  quotaResetDays: number;
  totalPurchasedTokens: number;
} {
  const budgetParsed = z.coerce
    .number()
    .int()
    .min(500)
    .max(10_000_000)
    .safeParse(envSource.AI_USER_TOKEN_BUDGET);

  const resetDaysParsed = z.coerce
    .number()
    .int()
    .min(1)
    .max(30)
    .safeParse(envSource.AI_QUOTA_RESET_DAYS);

  const totalTokensParsed = z.coerce
    .number()
    .int()
    .min(1000)
    .safeParse(envSource.AI_TOTAL_PURCHASED_TOKENS);

  return {
    userTokenBudget: budgetParsed.success
      ? budgetParsed.data
      : DEFAULT_AI_USER_TOKEN_BUDGET,
    quotaResetDays: resetDaysParsed.success
      ? resetDaysParsed.data
      : DEFAULT_AI_QUOTA_RESET_DAYS,
    totalPurchasedTokens: totalTokensParsed.success
      ? totalTokensParsed.data
      : DEFAULT_AI_TOTAL_PURCHASED_TOKENS,
  };
}

export function hasAiServerConfig(
  envSource: Record<string, string | undefined> = process.env,
): boolean {
  const parsed = aiServerEnvSchema.safeParse({
    apiKey: envSource.AI_API_KEY,
    baseUrl: envSource.AI_BASE_URL || DEFAULT_AI_BASE_URL,
    model: envSource.AI_MODEL || DEFAULT_AI_MODEL,
    userTokenBudget:
      envSource.AI_USER_TOKEN_BUDGET ?? DEFAULT_AI_USER_TOKEN_BUDGET,
    quotaResetDays: envSource.AI_QUOTA_RESET_DAYS ?? DEFAULT_AI_QUOTA_RESET_DAYS,
    totalPurchasedTokens:
      envSource.AI_TOTAL_PURCHASED_TOKENS ?? DEFAULT_AI_TOTAL_PURCHASED_TOKENS,
  });
  return parsed.success;
}

export function getAiServerConfig(
  envSource: Record<string, string | undefined> = process.env,
): AiServerConfig {
  const parsed = aiServerEnvSchema.safeParse({
    apiKey: envSource.AI_API_KEY,
    baseUrl: envSource.AI_BASE_URL || DEFAULT_AI_BASE_URL,
    model: envSource.AI_MODEL || DEFAULT_AI_MODEL,
    userTokenBudget:
      envSource.AI_USER_TOKEN_BUDGET ?? DEFAULT_AI_USER_TOKEN_BUDGET,
    quotaResetDays: envSource.AI_QUOTA_RESET_DAYS ?? DEFAULT_AI_QUOTA_RESET_DAYS,
    totalPurchasedTokens:
      envSource.AI_TOTAL_PURCHASED_TOKENS ?? DEFAULT_AI_TOTAL_PURCHASED_TOKENS,
  });

  if (!parsed.success) {
    const firstIssue =
      parsed.error.issues[0]?.message ?? "Konfigurasi AI belum lengkap.";
    throw new Error(
      `Konfigurasi server AI belum siap (${firstIssue}). Pastikan AI_API_KEY sudah diatur di .env.`,
    );
  }

  return {
    ...parsed.data,
    baseUrl: parsed.data.baseUrl.replace(/\/+$/, ""),
  };
}

export const aiExplanationInputSchema = z.object({
  attemptId: z.uuid({ error: "ID sesi latihan tidak valid." }),
  questionId: z
    .string()
    .trim()
    .regex(/^[AB]\d{2}$/, { error: "ID soal tidak valid." }),
  language: z.enum(SUPPORTED_LANGUAGES, {
    error: "Bahasa soal tidak valid.",
  }),
});

export const askAiInputSchema = z.object({
  attemptId: z.uuid({ error: "ID sesi latihan tidak valid." }),
  questionId: z
    .string()
    .trim()
    .regex(/^[AB]\d{2}$/, { error: "ID soal tidak valid." }),
  language: z.enum(SUPPORTED_LANGUAGES, {
    error: "Bahasa soal tidak valid.",
  }),
  prompt: z
    .string()
    .trim()
    .min(AI_MIN_QUESTION_CHARS, {
      error: `Pertanyaan minimal ${AI_MIN_QUESTION_CHARS} karakter.`,
    }),
});

export const aiRecommendationInputSchema = z.object({
  attemptId: z.uuid({ error: "ID sesi tryout tidak valid." }),
});

export const adminQuotaAdjustmentSchema = z.object({
  targetUserId: z.uuid({ error: "ID peserta tidak valid." }),
  action: z.enum(["reset", "add_percent"], {
    error: "Tindakan kuota tidak valid.",
  }),
  percentToAdd: z.coerce
    .number()
    .int()
    .min(1, { error: "Tambahan kuota minimal 1%." })
    .max(100, { error: "Tambahan kuota maksimal 100%." })
    .optional(),
});

