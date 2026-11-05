import "server-only";
import {
  AI_REQUEST_TIMEOUT_MS,
  DEFAULT_AI_BASE_URL,
  GLOBAL_QUOTA_CACHE_TTL_MS,
  GLOBAL_QUOTA_WARNING_PERCENT,
  getAiBudgetSettings,
  getAiServerConfig,
  hasAiServerConfig,
} from "@/lib/ai/ai-config";
import type { FetchLike } from "@/lib/ai/client";
import { getPlatformTotalAiTokensUsed } from "@/lib/ai/quota";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AiGlobalQuotaStatus } from "@/lib/types";

const MAX_PERCENT = 100;

export interface ParsedQuotaMetrics {
  remainingPercent: number | null;
  usedPercent: number | null;
  totalTokens: number | null;
  usedTokens: number | null;
  remainingTokens: number | null;
  isExhausted: boolean;
}

interface CachedGlobalQuota {
  metrics: ParsedQuotaMetrics;
  source: "remote" | "fallback";
  responseNote: string | null;
  endpointUrl: string | null;
  checkedAtIso: string;
  expiresAtMs: number;
}

let cachedQuota: CachedGlobalQuota | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFiniteNumber(
  record: Record<string, unknown>,
  keys: readonly string[],
): number | null {
  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === "string" && raw.trim() !== "") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function clampPercent(value: number): number {
  const clamped = Math.min(MAX_PERCENT, Math.max(0, value));
  return Math.round(clamped * 100) / 100;
}

export function parseRemoteQuotaPayload(
  rawPayload: unknown,
): ParsedQuotaMetrics {
  const emptyMetrics: ParsedQuotaMetrics = {
    remainingPercent: null,
    usedPercent: null,
    totalTokens: null,
    usedTokens: null,
    remainingTokens: null,
    isExhausted: false,
  };

  if (!isRecord(rawPayload)) {
    return emptyMetrics;
  }

  const candidate = isRecord(rawPayload.data)
    ? rawPayload.data
    : isRecord(rawPayload.quota)
      ? rawPayload.quota
      : rawPayload;

  const totalTokens = readFiniteNumber(candidate, [
    "total",
    "total_tokens",
    "totalTokens",
    "limit",
    "token_limit",
    "quota",
    "max_quota",
  ]);
  const usedTokens = readFiniteNumber(candidate, [
    "used",
    "used_tokens",
    "usedTokens",
    "usage",
    "token_used",
    "used_quota",
  ]);
  const remainingTokens = readFiniteNumber(candidate, [
    "remaining",
    "remaining_tokens",
    "remainingTokens",
    "balance",
    "available",
    "remain_quota",
  ]);

  const explicitRemainingPercent = readFiniteNumber(candidate, [
    "remaining_percent",
    "remainingPercent",
    "percent_remaining",
    "percentage_remaining",
  ]);

  if (explicitRemainingPercent !== null) {
    const remainingPercent = clampPercent(explicitRemainingPercent);
    const usedPercent = clampPercent(MAX_PERCENT - remainingPercent);
    return {
      remainingPercent,
      usedPercent,
      totalTokens,
      usedTokens,
      remainingTokens,
      isExhausted: remainingPercent <= 0,
    };
  }

  if (totalTokens !== null && totalTokens > 0) {
    if (remainingTokens !== null) {
      const remainingPercent = clampPercent(
        (remainingTokens / totalTokens) * MAX_PERCENT,
      );
      const usedPercent = clampPercent(MAX_PERCENT - remainingPercent);
      return {
        remainingPercent,
        usedPercent,
        totalTokens,
        usedTokens: usedTokens ?? Math.max(0, totalTokens - remainingTokens),
        remainingTokens,
        isExhausted: remainingTokens <= 0 || remainingPercent <= 0,
      };
    }

    if (usedTokens !== null) {
      const usedPercent = clampPercent((usedTokens / totalTokens) * MAX_PERCENT);
      const remainingPercent = clampPercent(MAX_PERCENT - usedPercent);
      return {
        remainingPercent,
        usedPercent,
        totalTokens,
        usedTokens,
        remainingTokens: remainingTokens ?? Math.max(0, totalTokens - usedTokens),
        isExhausted: usedTokens >= totalTokens || remainingPercent <= 0,
      };
    }
  }

  if (remainingTokens !== null && usedTokens !== null) {
    const inferredTotal = remainingTokens + usedTokens;
    if (inferredTotal > 0) {
      const remainingPercent = clampPercent(
        (remainingTokens / inferredTotal) * MAX_PERCENT,
      );
      const usedPercent = clampPercent(MAX_PERCENT - remainingPercent);
      return {
        remainingPercent,
        usedPercent,
        totalTokens: inferredTotal,
        usedTokens,
        remainingTokens,
        isExhausted: remainingTokens <= 0 || remainingPercent <= 0,
      };
    }
  }

  if (remainingTokens !== null) {
    return {
      remainingPercent: null,
      usedPercent: null,
      totalTokens,
      usedTokens,
      remainingTokens,
      isExhausted: remainingTokens <= 0,
    };
  }

  return emptyMetrics;
}

export function evaluateGlobalQuotaStatus(params: {
  isEnabled: boolean;
  isConfigured: boolean;
  metrics: ParsedQuotaMetrics;
  source: "remote" | "fallback";
  responseNote?: string | null;
  endpointUrl?: string | null;
  checkedAt: string;
}): AiGlobalQuotaStatus {
  const {
    isEnabled,
    isConfigured,
    metrics,
    source,
    responseNote,
    endpointUrl,
    checkedAt,
  } = params;
  const isLowWarning =
    metrics.remainingPercent !== null &&
    metrics.remainingPercent < GLOBAL_QUOTA_WARNING_PERCENT;
  const isAvailable = isEnabled && isConfigured && !metrics.isExhausted;

  return {
    isEnabled,
    isAvailable,
    remainingPercent: metrics.remainingPercent,
    usedPercent: metrics.usedPercent,
    totalTokens: metrics.totalTokens,
    usedTokens: metrics.usedTokens,
    remainingTokens: metrics.remainingTokens,
    isLowWarning,
    isExhausted: metrics.isExhausted,
    source,
    responseNote: responseNote ?? null,
    endpointUrl: endpointUrl ?? null,
    checkedAt,
  };
}

export function clearGlobalQuotaCache(): void {
  cachedQuota = null;
}

export async function getAiEnabledSetting(): Promise<boolean> {
  if (!hasSupabasePublicEnv()) {
    return true;
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("ai_settings")
      .select("is_enabled")
      .eq("id", "global")
      .maybeSingle<{ is_enabled: boolean }>();

    return data?.is_enabled ?? true;
  } catch {
    return true;
  }
}

async function fetchRemoteQuotaMetrics(options?: {
  envSource?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
}): Promise<{
  metrics: ParsedQuotaMetrics;
  source: "remote" | "fallback";
  responseNote: string | null;
  endpointUrl: string;
}> {
  const config = getAiServerConfig(options?.envSource);
  const fetchFn = options?.fetchImpl ?? fetch;
  const endpoint = `${config.baseUrl}/quota`;

  const controller = new AbortController();
  const timeoutHandle = setTimeout(
    () => controller.abort(),
    AI_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetchFn(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      return {
        metrics: {
          remainingPercent: null,
          usedPercent: null,
          totalTokens: null,
          usedTokens: null,
          remainingTokens: null,
          isExhausted: false,
        },
        source: "fallback",
        responseNote: `Endpoint /v1/quota merespons status HTTP ${response.status}.`,
        endpointUrl: endpoint,
      };
    }

    if (contentType.includes("text/html")) {
      return {
        metrics: {
          remainingPercent: null,
          usedPercent: null,
          totalTokens: null,
          usedTokens: null,
          remainingTokens: null,
          isExhausted: false,
        },
        source: "fallback",
        responseNote:
          "Penyedia router.ryzumi.net saat ini mengembalikan dokumen Web SPA (HTML), belum menyediakan rute API JSON untuk /v1/quota. Sistem otomatis melacak kuota berbasis akumulasi token log database platform.",
        endpointUrl: endpoint,
      };
    }

    const payload: unknown = await response.json();
    return {
      metrics: parseRemoteQuotaPayload(payload),
      source: "remote",
      responseNote: null,
      endpointUrl: endpoint,
    };
  } catch (error) {
    return {
      metrics: {
        remainingPercent: null,
        usedPercent: null,
        totalTokens: null,
        usedTokens: null,
        remainingTokens: null,
        isExhausted: false,
      },
      source: "fallback",
      responseNote:
        error instanceof Error
          ? `Gagal terhubung ke endpoint kuota: ${error.message}`
          : "Gagal terhubung ke endpoint kuota AI.",
      endpointUrl: endpoint,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function getGlobalAiQuotaStatus(options?: {
  forceRefresh?: boolean;
  envSource?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
  isEnabledOverride?: boolean;
}): Promise<AiGlobalQuotaStatus> {
  const envSource = options?.envSource ?? process.env;
  const isConfigured = hasAiServerConfig(envSource);
  const isEnabled =
    options?.isEnabledOverride !== undefined
      ? options.isEnabledOverride
      : await getAiEnabledSetting();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  if (!isConfigured) {
    return evaluateGlobalQuotaStatus({
      isEnabled,
      isConfigured: false,
      metrics: {
        remainingPercent: null,
        usedPercent: null,
        totalTokens: null,
        usedTokens: null,
        remainingTokens: null,
        isExhausted: false,
      },
      source: "fallback",
      responseNote: "Konfigurasi server AI belum disetel di .env.",
      endpointUrl: null,
      checkedAt: nowIso,
    });
  }

  let fetched: {
    metrics: ParsedQuotaMetrics;
    source: "remote" | "fallback";
    responseNote: string | null;
    endpointUrl: string;
  };

  if (
    !options?.forceRefresh &&
    cachedQuota &&
    nowMs < cachedQuota.expiresAtMs
  ) {
    fetched = {
      metrics: cachedQuota.metrics,
      source: cachedQuota.source,
      responseNote: cachedQuota.responseNote,
      endpointUrl: cachedQuota.endpointUrl ?? `${DEFAULT_AI_BASE_URL}/quota`,
    };
  } else {
    fetched = await fetchRemoteQuotaMetrics(options);
    cachedQuota = {
      metrics: fetched.metrics,
      source: fetched.source,
      responseNote: fetched.responseNote,
      endpointUrl: fetched.endpointUrl,
      checkedAtIso: nowIso,
      expiresAtMs: nowMs + GLOBAL_QUOTA_CACHE_TTL_MS,
    };
  }

  // Jika penyedia remote tidak menyediakan persentase/token, gunakan pelacakan platform lokal
  let finalMetrics = fetched.metrics;
  if (
    fetched.source === "fallback" ||
    finalMetrics.remainingPercent === null ||
    finalMetrics.totalTokens === null
  ) {
    const { totalPurchasedTokens } = getAiBudgetSettings(envSource);
    const platformUsed = await getPlatformTotalAiTokensUsed();
    const safeRemaining = Math.max(0, totalPurchasedTokens - platformUsed);
    const remainingPercent = clampPercent(
      (safeRemaining / Math.max(1, totalPurchasedTokens)) * MAX_PERCENT,
    );
    const usedPercent = clampPercent(MAX_PERCENT - remainingPercent);

    finalMetrics = {
      totalTokens: totalPurchasedTokens,
      usedTokens: platformUsed,
      remainingTokens: safeRemaining,
      remainingPercent,
      usedPercent,
      isExhausted: safeRemaining <= 0,
    };
  }

  return evaluateGlobalQuotaStatus({
    isEnabled,
    isConfigured: true,
    metrics: finalMetrics,
    source: fetched.source,
    responseNote: fetched.responseNote,
    endpointUrl: fetched.endpointUrl,
    checkedAt: nowIso,
  });
}

