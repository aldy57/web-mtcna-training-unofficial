"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForAction } from "@/lib/auth";
import { deleteMaterialSchema, upsertMaterialSchema } from "@/lib/materials";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ActionResult, ReferenceSource } from "@/lib/types";

export async function upsertMaterialAction(
  rawInput: unknown,
): Promise<ActionResult<ReferenceSource>> {
  const auth = await requireAdminForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = upsertMaterialSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data sumber materi tidak valid.",
    };
  }

  const { id, title, url, description } = parsed.data;

  try {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("refs")
      .upsert(
        {
          id,
          title,
          url,
          description: description || "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select("id, title, url, description, created_at, updated_at")
      .single();

    if (error) {
      return {
        ok: false,
        error: `Gagal menyimpan sumber materi: ${error.message}`,
      };
    }

    revalidatePath("/materi");
    revalidatePath("/admin/materi");
    revalidatePath("/belajar");

    return {
      ok: true,
      data: {
        id: data.id,
        title: data.title,
        url: data.url,
        description: data.description || "",
        createdAt: data.created_at || undefined,
        updatedAt: data.updated_at || undefined,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return { ok: false, error: msg };
  }
}

export async function deleteMaterialAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdminForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = deleteMaterialSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "ID sumber materi tidak valid.",
    };
  }

  const { id } = parsed.data;

  try {
    const adminClient = createSupabaseAdminClient();
    const { error } = await adminClient.from("refs").delete().eq("id", id);

    if (error) {
      return {
        ok: false,
        error: `Gagal menghapus sumber materi: ${error.message}`,
      };
    }

    revalidatePath("/materi");
    revalidatePath("/admin/materi");
    revalidatePath("/belajar");

    return {
      ok: true,
      data: { id },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return { ok: false, error: msg };
  }
}

