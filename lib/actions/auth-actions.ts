"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOptionalUser, requireUserForAction } from "@/lib/auth";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import {
  changeOwnPasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileNameSchema,
} from "@/lib/validation";

export type FormActionState = ActionResult<string> | null;

async function autoConfirmUserByEmailIfNeeded(
  email: string,
): Promise<boolean> {
  try {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient.auth.admin.listUsers();
    if (error || !data?.users) {
      return false;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const targetUser = data.users.find(
      (user) => user.email?.toLowerCase() === normalizedEmail,
    );

    if (!targetUser || targetUser.email_confirmed_at) {
      return false;
    }

    const { error: updateError } =
      await adminClient.auth.admin.updateUserById(targetUser.id, {
        email_confirm: true,
      });

    return !updateError;
  } catch {
    return false;
  }
}

export async function loginAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  if (!hasSupabasePublicEnv()) {
    return {
      ok: false,
      error:
        "Konfigurasi Supabase belum diisi. Silakan lengkapi file .env terlebih dahulu.",
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Periksa kembali format email dan password Anda.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  let { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Jika akun peserta terdaftar saat konfirmasi email Supabase masih aktif,
    // konfirmasi otomatis di sisi server lalu ulangi proses masuk.
    const wasConfirmed = await autoConfirmUserByEmailIfNeeded(parsed.data.email);
    if (wasConfirmed) {
      const retryResult = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      error = retryResult.error;
    }
  }

  if (error) {
    return {
      ok: false,
      error: "Email atau kata sandi salah. Silakan coba lagi.",
    };
  }

  const loggedInUser = await getOptionalUser();
  revalidatePath("/", "layout");

  return {
    ok: true,
    data: loggedInUser?.role === "admin" ? "/admin" : "/dashboard",
  };
}

export async function registerAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  if (!hasSupabasePublicEnv()) {
    return {
      ok: false,
      error:
        "Konfigurasi Supabase belum diisi. Silakan lengkapi file .env terlebih dahulu.",
    };
  }

  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Data pendaftaran belum valid. Periksa kembali isian Anda.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  let registeredUserId: string | null = null;

  try {
    const adminClient = createSupabaseAdminClient();
    const { data: createdAuth, error: createError } =
      await adminClient.auth.admin.createUser({
        email: parsed.data.email,
        password: parsed.data.password,
        email_confirm: true,
        user_metadata: {
          full_name: parsed.data.fullName,
        },
      });

    if (createError || !createdAuth.user) {
      // Cek apakah akun sebelumnya sempat terdaftar tetapi belum terkonfirmasi
      const { data: listData } = await adminClient.auth.admin.listUsers();
      const existingUser = listData?.users.find(
        (u) => u.email?.toLowerCase() === parsed.data.email,
      );

      if (existingUser && !existingUser.email_confirmed_at) {
        const { error: repairError } =
          await adminClient.auth.admin.updateUserById(existingUser.id, {
            password: parsed.data.password,
            email_confirm: true,
            user_metadata: { full_name: parsed.data.fullName },
          });

        if (repairError) {
          return {
            ok: false,
            error: `Gagal mengaktifkan akun: ${repairError.message}`,
          };
        }
        registeredUserId = existingUser.id;
      } else {
        return {
          ok: false,
          error:
            "Email sudah terdaftar. Silakan masuk melalui halaman Login.",
        };
      }
    } else {
      registeredUserId = createdAuth.user.id;
    }

    if (registeredUserId) {
      await adminClient.from("profiles").upsert(
        {
          id: registeredUserId,
          email: parsed.data.email,
          full_name: parsed.data.fullName,
          role: "user",
        },
        { onConflict: "id" },
      );
    }
  } catch {
    // Fallback apabila SUPABASE_SERVICE_ROLE_KEY belum tersedia
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.fullName,
        },
      },
    });

    if (signUpError || !signUpData.user) {
      return {
        ok: false,
        error:
          signUpError?.message ??
          "Gagal mendaftarkan akun. Email mungkin sudah terdaftar.",
      };
    }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError) {
    return {
      ok: false,
      error:
        "Akun berhasil dibuat, namun gagal masuk otomatis. Silakan masuk melalui halaman Login.",
    };
  }

  revalidatePath("/", "layout");
  return {
    ok: true,
    data: "/dashboard",
  };
}

export async function logoutAction(): Promise<void> {
  if (hasSupabasePublicEnv()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function updateProfileNameAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const auth = await requireUserForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = updateProfileNameSchema.safeParse({
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Nama lengkap tidak valid.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", auth.user.id);

  if (error) {
    return {
      ok: false,
      error: "Gagal memperbarui nama profil.",
    };
  }

  revalidatePath("/akun");
  revalidatePath("/dashboard");
  return {
    ok: true,
    data: "Nama profil berhasil diperbarui.",
  };
}

export async function changeOwnPasswordAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const auth = await requireUserForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = changeOwnPasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Periksa kembali password baru Anda.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (error) {
    return {
      ok: false,
      error: `Gagal mengubah password: ${error.message}`,
    };
  }

  revalidatePath("/akun");
  return {
    ok: true,
    data: "Password akun Anda berhasil diperbarui.",
  };
}
