"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminForAction } from "@/lib/auth";
import {
  resetAppBranding,
  updateAppBranding,
} from "@/lib/branding-repo";
import type { ActionResult, AppBrandingInput, AppBrandingSettings } from "@/lib/types";

const brandingInputSchema = z.object({
  appName: z
    .string()
    .trim()
    .min(2, { error: "Nama aplikasi minimal 2 karakter." })
    .max(80, { error: "Nama aplikasi maksimal 80 karakter." }),
  appFullName: z
    .string()
    .trim()
    .min(2, { error: "Nama lengkap aplikasi minimal 2 karakter." })
    .max(150, { error: "Nama lengkap aplikasi maksimal 150 karakter." }),
  logoIconUrl: z
    .string()
    .trim()
    .min(1, { error: "Logo simbol / ikon harus disertakan." })
    .max(2_000_000, { error: "Ukuran berkas logo simbol terlalu besar (maksimal ~1.5MB)." }),
  logoWithTextUrl: z
    .string()
    .trim()
    .min(1, { error: "Logo dengan teks harus disertakan." })
    .max(2_000_000, { error: "Ukuran berkas logo dengan teks terlalu besar (maksimal ~1.5MB)." }),
  logoUrl: z.string().trim().max(2_000_000).optional(),
  faviconUrl: z.string().trim().max(2_000_000).optional(),
});

function revalidateAllAppPages(): void {
  revalidatePath("/", "layout");
  revalidatePath("/admin/pengaturan");
  revalidatePath("/login");
  revalidatePath("/daftar");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export async function updateAppBrandingAction(
  input: AppBrandingInput,
): Promise<ActionResult<AppBrandingSettings>> {
  const auth = await requireAdminForAction();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const parsed = brandingInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]?.toString() || "form";
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Data pengaturan branding tidak valid.",
      fieldErrors,
    };
  }

  try {
    const updated = await updateAppBranding(parsed.data, auth.admin.id);
    revalidateAllAppPages();
    return { ok: true, data: updated };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui pengaturan branding.";
    return { ok: false, error: message };
  }
}

export async function resetAppBrandingAction(): Promise<
  ActionResult<AppBrandingSettings>
> {
  const auth = await requireAdminForAction();
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  try {
    const reset = await resetAppBranding(auth.admin.id);
    revalidateAllAppPages();
    return { ok: true, data: reset };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengembalikan pengaturan branding default.";
    return { ok: false, error: message };
  }
}
