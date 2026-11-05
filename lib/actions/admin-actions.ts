"use server";

import { revalidatePath } from "next/cache";
import { deleteCachedAiExplanationsForQuestion } from "@/lib/ai/explanation-cache";
import { requireAdminForAction } from "@/lib/auth";
import { serializeSelectedOptions } from "@/lib/scoring";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ActionResult, Role } from "@/lib/types";
import {
  createAccountByAdminSchema,
  deleteParticipantAccountSchema,
  resetParticipantPasswordSchema,
  upsertQuestionSchema,
  verifyAdminTargetModification,
} from "@/lib/validation";

export type AdminFormState = ActionResult<string> | null;

interface TargetProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: Role;
}

export async function createAccountByAdminAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const auth = await requireAdminForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = createAccountByAdminSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Data akun baru belum lengkap atau tidak valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.fullName },
    });

  if (createError || !created.user) {
    return {
      ok: false,
      error:
        createError?.message ??
        "Gagal membuat akun baru. Pastikan email belum dipakai.",
    };
  }

  if (parsed.data.role === "admin") {
    await adminClient.from("profiles").delete().eq("id", created.user.id);
  }

  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: created.user.id,
      email: parsed.data.email,
      full_name: parsed.data.fullName,
      role: parsed.data.role,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return {
      ok: false,
      error: `Akun terbuat tetapi gagal menyimpan role: ${profileError.message}`,
    };
  }

  await adminClient.from("admin_audit_log").insert({
    admin_id: auth.admin.id,
    action:
      parsed.data.role === "admin"
        ? "CREATE_ADMIN_ACCOUNT"
        : "CREATE_PARTICIPANT_ACCOUNT",
    target_id: created.user.id,
    details: {
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      assignedRole: parsed.data.role,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/pengguna");
  const roleLabel = parsed.data.role === "admin" ? "Admin" : "Peserta";
  return {
    ok: true,
    data: `Akun ${roleLabel} (${parsed.data.email}) berhasil dibuat.`,
  };
}

export async function resetParticipantPasswordAction(
  formData: FormData,
): Promise<ActionResult<string>> {
  const auth = await requireAdminForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = resetParticipantPasswordSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    const firstError =
      parsed.error.issues[0]?.message ?? "Input reset password tidak valid.";
    return { ok: false, error: firstError };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: targetProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", parsed.data.targetUserId)
    .single<TargetProfileRow>();

  if (profileError || !targetProfile) {
    return { ok: false, error: "Akun target tidak ditemukan." };
  }

  const guard = verifyAdminTargetModification({
    actorRole: auth.admin.role,
    targetRole: targetProfile.role,
    operation: "reset_password",
  });

  if (!guard.allowed) {
    await adminClient.from("admin_audit_log").insert({
      admin_id: auth.admin.id,
      action: "REJECTED_RESET_ADMIN_PASSWORD",
      target_id: targetProfile.id,
      details: { targetEmail: targetProfile.email },
    });
    return { ok: false, error: guard.error };
  }

  const { error: updateError } =
    await adminClient.auth.admin.updateUserById(targetProfile.id, {
      password: parsed.data.newPassword,
    });

  if (updateError) {
    return {
      ok: false,
      error: `Gagal mereset password peserta: ${updateError.message}`,
    };
  }

  await adminClient.from("admin_audit_log").insert({
    admin_id: auth.admin.id,
    action: "RESET_PARTICIPANT_PASSWORD",
    target_id: targetProfile.id,
    details: { targetEmail: targetProfile.email },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/pengguna");
  return {
    ok: true,
    data: `Password peserta ${targetProfile.email} berhasil diperbarui.`,
  };
}

export async function deleteParticipantAccountAction(
  formData: FormData,
): Promise<ActionResult<string>> {
  const auth = await requireAdminForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = deleteParticipantAccountSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
  });

  if (!parsed.success) {
    return { ok: false, error: "ID akun tidak valid." };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: targetProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", parsed.data.targetUserId)
    .single<TargetProfileRow>();

  if (profileError || !targetProfile) {
    return { ok: false, error: "Akun target tidak ditemukan." };
  }

  const guard = verifyAdminTargetModification({
    actorRole: auth.admin.role,
    targetRole: targetProfile.role,
    operation: "delete_account",
  });

  if (!guard.allowed) {
    await adminClient.from("admin_audit_log").insert({
      admin_id: auth.admin.id,
      action: "REJECTED_DELETE_ADMIN_ACCOUNT",
      target_id: targetProfile.id,
      details: { targetEmail: targetProfile.email },
    });
    return { ok: false, error: guard.error };
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    targetProfile.id,
  );

  if (deleteError) {
    return {
      ok: false,
      error: `Gagal menghapus akun peserta: ${deleteError.message}`,
    };
  }

  await adminClient.from("admin_audit_log").insert({
    admin_id: auth.admin.id,
    action: "DELETE_PARTICIPANT_ACCOUNT",
    target_id: targetProfile.id,
    details: {
      targetEmail: targetProfile.email,
      targetName: targetProfile.full_name,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/pengguna");
  return {
    ok: true,
    data: `Akun peserta ${targetProfile.email} beserta seluruh riwayat tryout berhasil dihapus.`,
  };
}

export async function upsertQuestionAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const auth = await requireAdminForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = upsertQuestionSchema.safeParse({
    id: formData.get("id"),
    topic: formData.get("topic"),
    kind: formData.get("kind"),
    sortOrder: formData.get("sortOrder"),
    answerKey: formData.get("answerKey"),
    sourceIds: formData.get("sourceIds"),
    bodyId: formData.get("bodyId"),
    optionsId: {
      A: formData.get("optionIdA"),
      B: formData.get("optionIdB"),
      C: formData.get("optionIdC"),
      D: formData.get("optionIdD"),
    },
    explanationId: formData.get("explanationId"),
    bodyEn: formData.get("bodyEn"),
    optionsEn: {
      A: formData.get("optionEnA"),
      B: formData.get("optionEnB"),
      C: formData.get("optionEnC"),
      D: formData.get("optionEnD"),
    },
    explanationEn: formData.get("explanationEn"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Periksa kembali isian form soal.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const normalizedKey = serializeSelectedOptions(data.answerKey.split(""));
  const sourceList = data.sourceIds
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  const adminClient = createSupabaseAdminClient();

  const { error: questionErr } = await adminClient.from("questions").upsert(
    {
      id: data.id,
      topic: data.topic,
      kind: data.kind,
      sort_order: data.sortOrder,
      source_ids: sourceList,
    },
    { onConflict: "id" },
  );

  if (questionErr) {
    return {
      ok: false,
      error: `Gagal menyimpan metadata soal: ${questionErr.message}`,
    };
  }

  const { error: transErr } = await adminClient
    .from("question_translations")
    .upsert(
      [
        {
          question_id: data.id,
          lang: "id",
          body: data.bodyId,
          options: data.optionsId,
          explanation: data.explanationId,
        },
        {
          question_id: data.id,
          lang: "en",
          body: data.bodyEn,
          options: data.optionsEn,
          explanation: data.explanationEn,
        },
      ],
      { onConflict: "question_id,lang" },
    );

  if (transErr) {
    return {
      ok: false,
      error: `Gagal menyimpan terjemahan soal: ${transErr.message}`,
    };
  }

  const { error: keyErr } = await adminClient.from("question_keys").upsert(
    {
      question_id: data.id,
      answer: normalizedKey,
    },
    { onConflict: "question_id" },
  );

  if (keyErr) {
    return {
      ok: false,
      error: `Gagal menyimpan kunci jawaban: ${keyErr.message}`,
    };
  }

  await deleteCachedAiExplanationsForQuestion(data.id);

  await adminClient.from("admin_audit_log").insert({
    admin_id: auth.admin.id,
    action: "UPSERT_QUESTION",
    target_id: data.id,
    details: { topic: data.topic, kind: data.kind },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/soal");
  return {
    ok: true,
    data: `Soal ${data.id} (${data.topic}) berhasil disimpan.`,
  };
}

export async function deleteQuestionAction(
  formData: FormData,
): Promise<ActionResult<string>> {
  const auth = await requireAdminForAction();
  if (!auth.ok) {
    return auth;
  }

  const questionId = String(formData.get("questionId") ?? "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]\d{2}$/.test(questionId)) {
    return { ok: false, error: "ID soal tidak valid." };
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient
    .from("questions")
    .delete()
    .eq("id", questionId);

  if (error) {
    return { ok: false, error: `Gagal menghapus soal: ${error.message}` };
  }

  await deleteCachedAiExplanationsForQuestion(questionId);

  await adminClient.from("admin_audit_log").insert({
    admin_id: auth.admin.id,
    action: "DELETE_QUESTION",
    target_id: questionId,
    details: {},
  });

  revalidatePath("/admin");
  revalidatePath("/admin/soal");
  return { ok: true, data: `Soal ${questionId} berhasil dihapus.` };
}

