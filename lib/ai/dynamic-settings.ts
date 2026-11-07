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
import type { AiCustomModel, AiDynamicSettings } from "@/lib/types";

export interface AiSettingsRow {
  base_url: string | null;
  model: string | null;
  user_token_budget: number | null;
  quota_reset_days: number | null;
  available_models?: AiCustomModel[] | null;
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

  const rawModels = dynamicRow?.available_models;
  let effectiveModels: AiCustomModel[] = [];

  if (Array.isArray(rawModels) && rawModels.length > 0) {
    effectiveModels = rawModels.filter(
      (m): m is AiCustomModel =>
        typeof m === "object" &&
        m !== null &&
        typeof m.id === "string" &&
        m.id.trim().length > 0 &&
        typeof m.name === "string" &&
        m.name.trim().length > 0,
    );
  }

  // Jika belum ada model kustom terkonfigurasi, buat fallback default dari effectiveModel
  if (effectiveModels.length === 0) {
    effectiveModels = [
      {
        id: effectiveModel,
        name: "MIRA Standar",
        description: "Model bawaan sistem",
        isActive: true,
        isDefault: true,
      },
    ];
  }

  const isCustomized = Boolean(
    dynamicRow?.base_url ||
      dynamicRow?.model ||
      dynamicRow?.user_token_budget ||
      dynamicRow?.quota_reset_days ||
      (Array.isArray(dynamicRow?.available_models) &&
        dynamicRow.available_models.length > 0),
  );

  return {
    baseUrl: effectiveBaseUrl.replace(/\/+$/, ""),
    model: effectiveModel,
    userTokenBudget: effectiveBudget,
    quotaResetDays: effectiveResetDays,
    availableModels: effectiveModels,
    isCustomized,
    updatedAt: dynamicRow?.updated_at ?? null,
    updatedBy: dynamicRow?.updated_by ?? null,
  };
}

export function getActiveAiModels(
  settings: AiDynamicSettings,
): AiCustomModel[] {
  const active = settings.availableModels.filter((m) => m.isActive);
  if (active.length > 0) {
    return active;
  }
  return [
    {
      id: settings.model,
      name: "MIRA Standar",
      description: "Model bawaan sistem",
      isActive: true,
      isDefault: true,
    },
  ];
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
        "base_url, model, user_token_budget, quota_reset_days, available_models, updated_at, updated_by",
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

export async function getEffectiveActiveAiModels(): Promise<AiCustomModel[]> {
  const settings = await fetchDynamicAiSettings();
  return getActiveAiModels(settings);
}

