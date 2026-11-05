"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  adminQuotaAdjustmentSchema,
  getAiBudgetSettings,
} from "@/lib/ai/ai-config";
import { deleteCachedAiExplanationsForQuestion } from "@/lib/ai/explanation-cache";
import {
  clearGlobalQuotaCache,
  getGlobalAiQuotaStatus,
} from "@/lib/ai/global-quota";
import {
  applyAdminQuotaAdjustment,
  calculateQuotaStatus,
  getUserAiQuotaStatus,
} from "@/lib/ai/quota";
import { requireAdminForAction } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ActionResult,
  AiGlobalQuotaStatus,
  AiQuotaStatus,
  Role,
} from "@/lib/types";

interface TargetProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: Role;
}

const toggleGlobalAiSchema = z.object({
  isEnabled: z.boolean({ error: "Status sakelar AI harus berupa boolean." }),
});

const clearQuestionCacheSchema = z.object({
  questionId: z
    .string()
    .trim()
    .toUpperCase()
    .refine((val) => val === "ALL" || /^[AB]\d{2}$/.test(val), {
      message: "ID soal harus berupa kode A01–B19 atau ALL.",
    }),
});

export async function toggleGlobalAiEnabledAction(input: {
  isEnabled: boolean;
}): Promise<ActionResult<AiGlobalQuotaStatus>> {
  const auth = await requireAdminForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = toggleGlobalAiSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Input pengaturan AI tidak valid.",
    };
  }

  const nowIso = new Date().toISOString();
  const adminClient = createSupabaseAdminClient();

  const { error } = await adminClient.from("ai_settings").upsert(
    {
      id: "global",
      is_enabled: parsed.data.isEnabled,
      updated_by: auth.admin.id,
      updated_at: nowIso,
    },
    { onConflict: "id" },
  );

  if (error) {
    return {
      ok: false,
      error: `Gagal memperbarui status fitur AI: ${error.message}`,
    };
  }

  await adminClient.from("admin_audit_log").insert({
    admin_id: auth.admin.id,
    action: parsed.data.isEnabled
      ? "ENABLE_GLOBAL_AI"
      : "DISABLE_GLOBAL_AI",
    target_id: "global",
    details: { isEnabled: parsed.data.isEnabled },
  });

  clearGlobalQuotaCache();
  const updatedStatus = await getGlobalAiQuotaStatus({
    isEnabledOverride: parsed.data.isEnabled,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/ai");
  return { ok: true, data: updatedStatus };
}

export async function refreshGlobalAiQuotaAction(): Promise<
  ActionResult<AiGlobalQuotaStatus>
> {
  const auth = await requireAdminForAction();
  if (!auth.ok) {
    return auth;
  }

  const updatedStatus = await getGlobalAiQuotaStatus({ forceRefresh: true });
  revalidatePath("/admin");
  revalidatePath("/admin/ai");
  return { ok: true, data: updatedStatus };
}

export async function adjustParticipantAiQuotaAction(input: {
  targetUserId: string;
  action: "reset" | "add_percent";
  percentToAdd?: number;
}): Promise<ActionResult<{ message: string; quota: AiQuotaStatus }>> {
  const auth = await requireAdminForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = adminQuotaAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Input penyesuaian kuota peserta tidak valid.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: targetProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", parsed.data.targetUserId)
    .single<TargetProfileRow>();

  if (profileError || !targetProfile) {
    return { ok: false, error: "Akun peserta tidak ditemukan." };
  }

  if (targetProfile.role !== "user") {
    return {
      ok: false,
      error: "Penyesuaian kuota AI hanya berlaku untuk akun peserta.",
    };
  }

  const { userTokenBudget } = getAiBudgetSettings();
  const nowIso = new Date().toISOString();
  const currentQuota = await getUserAiQuotaStatus(targetProfile.id);

  const adjusted = applyAdminQuotaAdjustment({
    currentTokensUsed: currentQuota.tokensUsed,
    periodStartedAt: currentQuota.periodStartedAt,
    tokenBudget: userTokenBudget,
    action: parsed.data.action,
    percentToAdd: parsed.data.percentToAdd,
    nowIso,
  });

  const { error: upsertError } = await adminClient
    .from("ai_user_quotas")
    .upsert(
      {
        user_id: targetProfile.id,
        tokens_used: adjusted.tokensUsed,
        period_started_at: adjusted.periodStartedAt,
        reset_at: adjusted.resetAt,
        updated_at: nowIso,
      },
      { onConflict: "user_id" },
    );

  if (upsertError) {
    return {
      ok: false,
      error: `Gagal memperbarui kuota AI peserta: ${upsertError.message}`,
    };
  }

  const updatedQuota = calculateQuotaStatus({
    userId: targetProfile.id,
    tokensUsed: adjusted.tokensUsed,
    periodStartedAt: adjusted.periodStartedAt,
    resetAt: adjusted.resetAt,
    tokenBudget: userTokenBudget,
    nowIso,
  });

  await adminClient.from("admin_audit_log").insert({
    admin_id: auth.admin.id,
    action:
      parsed.data.action === "reset"
        ? "RESET_PARTICIPANT_AI_QUOTA"
        : "ADD_PARTICIPANT_AI_QUOTA",
    target_id: targetProfile.id,
    details: {
      targetEmail: targetProfile.email,
      action: parsed.data.action,
      percentToAdd: parsed.data.percentToAdd ?? 100,
      newRemainingPercent: updatedQuota.remainingPercent,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/ai");
  revalidatePath("/akun");

  const actionLabel =
    parsed.data.action === "reset"
      ? "direset ke 100%"
      : `ditambah +${parsed.data.percentToAdd ?? 100}% (sisa ${updatedQuota.remainingPercent}%)`;

  return {
    ok: true,
    data: {
      message: `Kuota AI peserta ${targetProfile.email} berhasil ${actionLabel}.`,
      quota: updatedQuota,
    },
  };
}

export async function clearQuestionAiCacheAction(input: {
  questionId: string;
}): Promise<ActionResult<string>> {
  const auth = await requireAdminForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = clearQuestionCacheSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Kode soal untuk hapus cache tidak valid.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const targetQuestionId = parsed.data.questionId;

  if (targetQuestionId === "ALL") {
    const { error } = await adminClient
      .from("ai_explanations")
      .delete()
      .neq("question_id", "");

    if (error) {
      return {
        ok: false,
        error: `Gagal menghapus seluruh cache penjelasan AI: ${error.message}`,
      };
    }
  } else {
    await deleteCachedAiExplanationsForQuestion(targetQuestionId);
  }

  await adminClient.from("admin_audit_log").insert({
    admin_id: auth.admin.id,
    action: "CLEAR_AI_EXPLANATION_CACHE",
    target_id: targetQuestionId,
    details: {},
  });

  revalidatePath("/admin");
  revalidatePath("/admin/ai");
  return {
    ok: true,
    data:
      targetQuestionId === "ALL"
        ? "Seluruh cache penjelasan umum AI berhasil dibersihkan."
        : `Cache penjelasan umum AI untuk soal ${targetQuestionId} berhasil dibersihkan.`,
  };
}

