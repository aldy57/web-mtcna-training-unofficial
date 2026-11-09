import "server-only";
import {
  DEFAULT_AI_QUOTA_RESET_DAYS,
  DEFAULT_AI_USER_TOKEN_BUDGET,
  getAiBudgetSettings,
} from "@/lib/ai/ai-config";
import { fetchDynamicAiSettings } from "@/lib/ai/dynamic-settings";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AiFeature, AiQuotaStatus, AiUsageLogEntry } from "@/lib/types";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_PERCENT = 100;
const DEFAULT_USAGE_HISTORY_LIMIT = 20;

interface QuotaRow {
  user_id: string;
  tokens_used: number;
  period_started_at: string;
  reset_at: string | null;
}

interface UsageLogRow {
  id: string;
  user_id: string;
  feature: AiFeature;
  question_id: string | null;
  attempt_id: string | null;
  tokens_used: number;
  percent_used: number | string;
  created_at: string;
}

export interface CalculateQuotaStatusParams {
  userId: string;
  tokensUsed: number;
  periodStartedAt: string;
  resetAt: string | null;
  tokenBudget?: number;
  resetDays?: number;
  nowIso?: string;
}

export interface ApplyTokenUsageParams {
  currentTokensUsed: number;
  periodStartedAt: string;
  resetAt: string | null;
  tokensToConsume: number;
  tokenBudget?: number;
  resetDays?: number;
  nowIso?: string;
}

export interface ApplyTokenUsageResult {
  tokensUsed: number;
  periodStartedAt: string;
  resetAt: string | null;
  percentConsumed: number;
}

export interface AdminAdjustQuotaParams {
  currentTokensUsed: number;
  periodStartedAt: string;
  tokenBudget?: number;
  action: "reset" | "add_percent";
  percentToAdd?: number;
  nowIso?: string;
}

export function shouldResetQuota(
  resetAtIso: string | null,
  nowIso: string = new Date().toISOString(),
  periodStartedAtIso?: string | null,
  resetDays: number = DEFAULT_AI_QUOTA_RESET_DAYS,
): boolean {
  const nowTimestamp = Date.parse(nowIso);
  if (Number.isNaN(nowTimestamp)) {
    return false;
  }

  // 1. Jika reset_at ditentukan (misal saat kuota habis), cek apakah sudah melewati jadwal reset_at
  if (resetAtIso) {
    const resetTimestamp = Date.parse(resetAtIso);
    if (!Number.isNaN(resetTimestamp) && nowTimestamp >= resetTimestamp) {
      return true;
    }
  }

  // 2. Jika masa periode reset_days sudah terlewati sejak pemakaian pertama dimulai
  if (periodStartedAtIso) {
    const periodStartTimestamp = Date.parse(periodStartedAtIso);
    if (!Number.isNaN(periodStartTimestamp)) {
      const resetThresholdMs =
        periodStartTimestamp + Math.max(1, resetDays) * MILLISECONDS_PER_DAY;
      if (nowTimestamp >= resetThresholdMs) {
        return true;
      }
    }
  }

  return false;
}

export function calculatePercentUsed(
  tokensUsed: number,
  tokenBudget: number = DEFAULT_AI_USER_TOKEN_BUDGET,
): number {
  const safeBudget = Math.max(1, tokenBudget);
  const clampedTokens = Math.min(safeBudget, Math.max(0, tokensUsed));
  const rawPercent = (clampedTokens / safeBudget) * MAX_PERCENT;
  return Math.min(MAX_PERCENT, Math.round(rawPercent * 100) / 100);
}

export function calculateQuotaStatus(
  params: CalculateQuotaStatusParams,
): AiQuotaStatus {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const safeBudget = Math.max(
    1,
    params.tokenBudget ?? DEFAULT_AI_USER_TOKEN_BUDGET,
  );
  const safeResetDays = Math.max(
    1,
    params.resetDays ?? DEFAULT_AI_QUOTA_RESET_DAYS,
  );

  let effectiveResetAt = params.resetAt;
  if (effectiveResetAt) {
    const maxFutureMs =
      Date.parse(nowIso) + safeResetDays * MILLISECONDS_PER_DAY;
    if (Date.parse(effectiveResetAt) > maxFutureMs) {
      effectiveResetAt = new Date(maxFutureMs).toISOString();
    }
  }

  const isResetDue = shouldResetQuota(
    effectiveResetAt,
    nowIso,
    params.periodStartedAt,
    safeResetDays,
  );

  const effectiveTokens = isResetDue
    ? 0
    : Math.min(safeBudget, Math.max(0, params.tokensUsed));
  const effectivePeriodStart = isResetDue ? nowIso : params.periodStartedAt;
  const finalResetAt = isResetDue ? null : effectiveResetAt;

  const usedPercent = calculatePercentUsed(effectiveTokens, safeBudget);
  const remainingPercent = Math.max(
    0,
    Math.round((MAX_PERCENT - usedPercent) * 100) / 100,
  );
  const isExhausted = effectiveTokens >= safeBudget || remainingPercent <= 0;

  return {
    userId: params.userId,
    tokensUsed: effectiveTokens,
    tokenBudget: safeBudget,
    usedPercent,
    remainingPercent,
    isExhausted,
    periodStartedAt: effectivePeriodStart,
    resetAt: isExhausted ? finalResetAt : null,
  };
}

export function applyTokenUsageToQuota(
  params: ApplyTokenUsageParams,
): ApplyTokenUsageResult {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const safeBudget = Math.max(
    1,
    params.tokenBudget ?? DEFAULT_AI_USER_TOKEN_BUDGET,
  );
  const safeResetDays = Math.max(
    1,
    params.resetDays ?? DEFAULT_AI_QUOTA_RESET_DAYS,
  );
  const safeConsumed = Math.max(0, Math.round(params.tokensToConsume));

  const isResetDue = shouldResetQuota(
    params.resetAt,
    nowIso,
    params.periodStartedAt,
    safeResetDays,
  );
  const baseTokens = isResetDue ? 0 : Math.max(0, params.currentTokensUsed);
  const periodStartedAt = isResetDue ? nowIso : params.periodStartedAt;
  const previousResetAt = isResetDue ? null : params.resetAt;

  const nextTokensUsed = Math.min(safeBudget, baseTokens + safeConsumed);
  const hasReachedZero = nextTokensUsed >= safeBudget;

  let nextResetAt = previousResetAt;
  if (hasReachedZero && !previousResetAt) {
    const resetTimeMs =
      Date.parse(nowIso) + safeResetDays * MILLISECONDS_PER_DAY;
    nextResetAt = new Date(resetTimeMs).toISOString();
  }

  return {
    tokensUsed: nextTokensUsed,
    periodStartedAt,
    resetAt: nextResetAt,
    percentConsumed: calculatePercentUsed(safeConsumed, safeBudget),
  };
}

export function applyAdminQuotaAdjustment(params: AdminAdjustQuotaParams): {
  tokensUsed: number;
  periodStartedAt: string;
  resetAt: null;
} {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const safeBudget = Math.max(
    1,
    params.tokenBudget ?? DEFAULT_AI_USER_TOKEN_BUDGET,
  );

  if (params.action === "reset") {
    return {
      tokensUsed: 0,
      periodStartedAt: nowIso,
      resetAt: null,
    };
  }

  const percentToRestore = Math.min(
    MAX_PERCENT,
    Math.max(1, params.percentToAdd ?? MAX_PERCENT),
  );
  const tokensToSubtract = Math.round((percentToRestore / MAX_PERCENT) * safeBudget);
  const nextTokensUsed = Math.max(0, params.currentTokensUsed - tokensToSubtract);

  return {
    tokensUsed: nextTokensUsed,
    periodStartedAt: params.periodStartedAt,
    resetAt: null,
  };
}

export async function getUserAiQuotaStatus(
  userId: string,
): Promise<AiQuotaStatus> {
  await fetchDynamicAiSettings();
  const { userTokenBudget, quotaResetDays } = getAiBudgetSettings();
  const nowIso = new Date().toISOString();

  if (!hasSupabasePublicEnv()) {
    return calculateQuotaStatus({
      userId,
      tokensUsed: 0,
      periodStartedAt: nowIso,
      resetAt: null,
      tokenBudget: userTokenBudget,
      resetDays: quotaResetDays,
      nowIso,
    });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("ai_user_quotas")
      .select("user_id, tokens_used, period_started_at, reset_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle<QuotaRow & { updated_at?: string }>();

    if (!data) {
      return calculateQuotaStatus({
        userId,
        tokensUsed: 0,
        periodStartedAt: nowIso,
        resetAt: null,
        tokenBudget: userTokenBudget,
        resetDays: quotaResetDays,
        nowIso,
      });
    }

    // Sesuaikan reset_at jika ada sisa data historis yang melebihi batas kebijakan baru (1 hari)
    let effectiveResetAt = data.reset_at;
    if (data.reset_at) {
      const referenceStartMs = Date.parse(
        data.updated_at || data.period_started_at || nowIso,
      );
      const maxAllowedResetMs =
        referenceStartMs + quotaResetDays * MILLISECONDS_PER_DAY;
      const currentResetMs = Date.parse(data.reset_at);

      if (currentResetMs > maxAllowedResetMs) {
        effectiveResetAt = new Date(maxAllowedResetMs).toISOString();
        void admin
          .from("ai_user_quotas")
          .update({
            reset_at: effectiveResetAt,
            updated_at: nowIso,
          })
          .eq("user_id", userId);
      }
    }

    if (
      shouldResetQuota(
        effectiveResetAt,
        nowIso,
        data.period_started_at,
        quotaResetDays,
      )
    ) {
      await admin
        .from("ai_user_quotas")
        .update({
          tokens_used: 0,
          period_started_at: nowIso,
          reset_at: null,
          updated_at: nowIso,
        })
        .eq("user_id", userId);

      return calculateQuotaStatus({
        userId,
        tokensUsed: 0,
        periodStartedAt: nowIso,
        resetAt: null,
        tokenBudget: userTokenBudget,
        resetDays: quotaResetDays,
        nowIso,
      });
    }

    return calculateQuotaStatus({
      userId,
      tokensUsed: data.tokens_used,
      periodStartedAt: data.period_started_at,
      resetAt: effectiveResetAt,
      tokenBudget: userTokenBudget,
      resetDays: quotaResetDays,
      nowIso,
    });
  } catch {
    return calculateQuotaStatus({
      userId,
      tokensUsed: 0,
      periodStartedAt: nowIso,
      resetAt: null,
      tokenBudget: userTokenBudget,
      resetDays: quotaResetDays,
      nowIso,
    });
  }
}

export async function consumeUserAiQuota(params: {
  userId: string;
  tokensUsed: number;
  feature: AiFeature;
  questionId?: string | null;
  attemptId?: string | null;
}): Promise<AiQuotaStatus> {
  await fetchDynamicAiSettings();
  const { userTokenBudget, quotaResetDays } = getAiBudgetSettings();
  const nowIso = new Date().toISOString();
  const admin = createSupabaseAdminClient();

  const { data: rpcRows, error: rpcError } = await admin.rpc(
    "consume_ai_user_quota",
    {
      p_user_id: params.userId,
      p_tokens: Math.max(0, Math.round(params.tokensUsed)),
      p_budget: userTokenBudget,
      p_reset_days: quotaResetDays,
      p_feature: params.feature,
      p_question_id: params.questionId ?? null,
      p_attempt_id: params.attemptId ?? null,
    },
  );

  if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
    const first = rpcRows[0] as {
      tokens_used: number;
      period_started_at: string;
      reset_at: string | null;
    };
    return calculateQuotaStatus({
      userId: params.userId,
      tokensUsed: first.tokens_used,
      periodStartedAt: first.period_started_at,
      resetAt: first.reset_at,
      tokenBudget: userTokenBudget,
      nowIso,
    });
  }

  // Fallback apabila fungsi RPC belum dijalankan di database
  const currentStatus = await getUserAiQuotaStatus(params.userId);
  const updated = applyTokenUsageToQuota({
    currentTokensUsed: currentStatus.tokensUsed,
    periodStartedAt: currentStatus.periodStartedAt,
    resetAt: currentStatus.resetAt,
    tokensToConsume: params.tokensUsed,
    tokenBudget: userTokenBudget,
    resetDays: quotaResetDays,
    nowIso,
  });

  await admin.from("ai_user_quotas").upsert(
    {
      user_id: params.userId,
      tokens_used: updated.tokensUsed,
      period_started_at: updated.periodStartedAt,
      reset_at: updated.resetAt,
      updated_at: nowIso,
    },
    { onConflict: "user_id" },
  );

  await admin.from("ai_usage_logs").insert({
    user_id: params.userId,
    feature: params.feature,
    question_id: params.questionId ?? null,
    attempt_id: params.attemptId ?? null,
    tokens_used: Math.max(0, Math.round(params.tokensUsed)),
    percent_used: updated.percentConsumed,
    created_at: nowIso,
  });

  return calculateQuotaStatus({
    userId: params.userId,
    tokensUsed: updated.tokensUsed,
    periodStartedAt: updated.periodStartedAt,
    resetAt: updated.resetAt,
    tokenBudget: userTokenBudget,
    nowIso,
  });
}

export async function getAllAiUsageHistory(
  limit: number = 200,
): Promise<AiUsageLogEntry[]> {
  if (!hasSupabasePublicEnv()) {
    return [];
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("ai_usage_logs")
      .select(
        "id, user_id, feature, question_id, attempt_id, tokens_used, percent_used, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<UsageLogRow[]>();

    return (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      feature: row.feature,
      questionId: row.question_id,
      attemptId: row.attempt_id,
      tokensUsed: Number(row.tokens_used ?? 0),
      percentUsed: Number(row.percent_used),
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getUserAiUsageHistory(
  userId: string,
  limit: number = DEFAULT_USAGE_HISTORY_LIMIT,
): Promise<AiUsageLogEntry[]> {
  if (!hasSupabasePublicEnv()) {
    return [];
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("ai_usage_logs")
      .select(
        "id, user_id, feature, question_id, attempt_id, tokens_used, percent_used, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<UsageLogRow[]>();

    return (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      feature: row.feature,
      questionId: row.question_id,
      attemptId: row.attempt_id,
      tokensUsed: Number(row.tokens_used ?? 0),
      percentUsed: Number(row.percent_used),
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getPlatformTotalAiTokensUsed(): Promise<number> {
  if (!hasSupabasePublicEnv()) {
    return 0;
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("ai_usage_logs")
      .select("tokens_used");

    if (error || !data) {
      return 0;
    }

    return data.reduce(
      (sum, row) => sum + (Number(row.tokens_used) || 0),
      0,
    );
  } catch {
    return 0;
  }
}


