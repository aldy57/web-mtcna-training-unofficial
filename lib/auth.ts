import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role, UserProfile } from "@/lib/types";
import { canRoleTakeQuiz } from "@/lib/validation";

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export async function getOptionalUser(): Promise<UserProfile | null> {
  if (!hasSupabasePublicEnv()) {
    return null;
  }

  await connection();

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .eq("id", user.id)
      .single<ProfileRow>();

    if (profileError || !profile) {
      return {
        id: user.id,
        email: user.email ?? "",
        fullName: "",
        role: "user",
        createdAt: user.created_at,
      };
    }

    return {
      id: profile.id,
      email: profile.email || user.email || "",
      fullName: profile.full_name,
      role: profile.role === "admin" ? "admin" : "user",
      createdAt: profile.created_at,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserProfile> {
  const user = await getOptionalUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRole(requiredRole: Role): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (requiredRole === "admin" && user.role !== "admin") {
    redirect("/dashboard");
  }
  if (requiredRole === "user" && !canRoleTakeQuiz(user.role)) {
    redirect("/admin");
  }
  return user;
}

export async function requireUserForAction(): Promise<
  { ok: true; user: UserProfile } | { ok: false; error: string }
> {
  const user = await getOptionalUser();
  if (!user) {
    return {
      ok: false,
      error: "Sesi Anda telah berakhir. Silakan masuk kembali.",
    };
  }
  return { ok: true, user };
}

export async function requireParticipantForAction(): Promise<
  { ok: true; user: UserProfile } | { ok: false; error: string }
> {
  const authResult = await requireUserForAction();
  if (!authResult.ok) {
    return authResult;
  }
  if (!canRoleTakeQuiz(authResult.user.role)) {
    return {
      ok: false,
      error:
        "Akses ditolak. Akun administrator tidak diperkenankan mengerjakan latihan atau tryout.",
    };
  }
  return { ok: true, user: authResult.user };
}

export async function requireAdminForAction(): Promise<
  { ok: true; admin: UserProfile } | { ok: false; error: string }
> {
  const authResult = await requireUserForAction();
  if (!authResult.ok) {
    return authResult;
  }
  if (authResult.user.role !== "admin") {
    return {
      ok: false,
      error: "Akses ditolak. Fitur ini hanya untuk administrator.",
    };
  }
  return { ok: true, admin: authResult.user };
}

