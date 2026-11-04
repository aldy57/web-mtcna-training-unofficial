import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabasePublicEnv } from "@/lib/env";

const PLACEHOLDER_SERVICE_KEY = "your-service-role-key";

const serviceKeySchema = z
  .string()
  .min(10, { error: "SUPABASE_SERVICE_ROLE_KEY belum diisi." })
  .refine((value) => value !== PLACEHOLDER_SERVICE_KEY, {
    message: "SUPABASE_SERVICE_ROLE_KEY masih menggunakan nilai placeholder.",
  });

export function createSupabaseAdminClient() {
  const { supabaseUrl } = getSupabasePublicEnv();
  const parsedKey = serviceKeySchema.safeParse(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  if (!parsedKey.success) {
    const reason =
      parsedKey.error.issues[0]?.message ??
      "SUPABASE_SERVICE_ROLE_KEY tidak valid.";
    throw new Error(
      `Konfigurasi server Supabase belum lengkap (${reason}). Periksa .env.local.`,
    );
  }

  return createClient(supabaseUrl, parsedKey.data, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

