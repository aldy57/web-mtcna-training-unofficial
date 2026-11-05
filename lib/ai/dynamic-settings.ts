import "server-only";
import { z } from "zod";
import {
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_QUOTA_RESET_DAYS,
  DEFAULT_AI_USER_TOKEN_BUDGET,
} from "@/lib/ai/ai-config";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AiDynamicSettings } from "@/lib/types";

export interface AiSettingsRow {
  base_url: string | null;
  model: string | null;
  user_token_budget: number | null;
  quota_reset_days: number | null;
  updated_at: string | null;
  updated_by: string | null;
}

let cachedRow: AiSettingsRow | null = null;
let cachedAtMs = 0;
const DYNAMIC_SETTINGS_CACHE_TTL_MS = 30_000;

export function resolveEffectiveAiConfig(
  dynamicRow: Partial<AiSettingsRow> | null | undefined,
  envSource: Record<string, string | undefined> = process.env,
): AiDynamicSettings {
  const envBaseUrl = envSource.AI_BASE_URL || DEFAULT_AI_BASE_URL;
  const envModel = envSource.AI_MODEL || DEFAULT_AI_MODEL;

  const parsedEnvBudget = z.coerce
    .number()
    .int()
    .min(500)
    .max(10_000_000)
    .safeParse(envSource.AI_USER_TOKEN_BUDGET);
  const envBudget = parsedEnvBudget.success
    ? parsedEnvBudget.data
    : DEFAULT_AI_USER_TOKEN_BUDGET;

  const parsedEnvResetDays = z.coerce
    .number()
    .int()
    .min(1)
    .max(30)
    .safeParse(envSource.AI_QUOTA_RESET_DAYS);
  const envResetDays = parsedEnvResetDays.success
    ? parsedEnvResetDays.data
    : DEFAULT_AI_QUOTA_RESET_DAYS;

  const effectiveBaseUrl = dynamicRow?.base_url?.trim() || envBaseUrl;
  const effectiveModel = dynamicRow?.model?.trim() || envModel;
  const effectiveBudget =
    typeof dynamicRow?.user_token_budget === "number" &&
    dynamicRow.user_token_budget >= 500 &&
    dynamicRow.user_token_budget <= 10_000_000
      ? dynamicRow.user_token_budget
      : envBudget;
  const effectiveResetDays =
    typeof dynamicRow?.quota_reset_days === "number" &&
    dynamicRow.quota_reset_days >= 1 &&
    dynamicRow.quota_reset_days <= 30
      ? dynamicRow.quota_reset_days
      : envResetDays;

  const isCustomized = Boolean(
    dynamicRow?.base_url ||
      dynamicRow?.model ||
      dynamicRow?.user_token_budget ||
      dynamicRow?.quota_reset_days,
  );

  return {
    baseUrl: effectiveBaseUrl.replace(/\/+$/, ""),
    model: effectiveModel,
    userTokenBudget: effectiveBudget,
    quotaResetDays: effectiveResetDays,
    isCustomized,
    updatedAt: dynamicRow?.updated_at ?? null,
    updatedBy: dynamicRow?.updated_by ?? null,
  };
}

export function clearDynamicAiSettingsCache(): void {
  cachedRow = null;
  cachedAtMs = 0;
}

export function setCachedDynamicAiSettings(row: AiSettingsRow | null): void {
  cachedRow = row;
  cachedAtMs = Date.now();
}

export function getCachedDynamicAiOverrides(): Partial<AiSettingsRow> | null {
  return cachedRow;
}

export async function fetchDynamicAiSettings(
  forceRefresh = false,
): Promise<AiDynamicSettings> {
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedRow !== null &&
    now - cachedAtMs < DYNAMIC_SETTINGS_CACHE_TTL_MS
  ) {
    return resolveEffectiveAiConfig(cachedRow, process.env);
  }

  if (!hasSupabasePublicEnv()) {
    return resolveEffectiveAiConfig(null, process.env);
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("ai_settings")
      .select(
        "base_url, model, user_token_budget, quota_reset_days, updated_at, updated_by",
      )
      .eq("id", "global")
      .maybeSingle<AiSettingsRow>();

    cachedRow = data ?? null;
    cachedAtMs = now;
    return resolveEffectiveAiConfig(cachedRow, process.env);
  } catch {
    return resolveEffectiveAiConfig(cachedRow, process.env);
  }
}

