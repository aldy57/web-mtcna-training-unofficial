import { z } from "zod";

const PLACEHOLDER_URL = "https://your-project-id.supabase.co";
const PLACEHOLDER_ANON_KEY = "your-anon-key";

const publicEnvSchema = z.object({
  supabaseUrl: z
    .url({ error: "NEXT_PUBLIC_SUPABASE_URL harus berupa URL yang valid." })
    .refine((value) => value !== PLACEHOLDER_URL, {
      message: "NEXT_PUBLIC_SUPABASE_URL masih menggunakan nilai placeholder.",
    }),
  supabaseAnonKey: z
    .string()
    .min(10, { error: "NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi." })
    .refine((value) => value !== PLACEHOLDER_ANON_KEY, {
      message: "NEXT_PUBLIC_SUPABASE_ANON_KEY masih menggunakan nilai placeholder.",
    }),
});

export interface SupabasePublicEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function hasSupabasePublicEnv(): boolean {
  const parsed = publicEnvSchema.safeParse({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return parsed.success;
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const parsed = publicEnvSchema.safeParse({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Konfigurasi Supabase belum lengkap.";
    throw new Error(
      `Konfigurasi Supabase belum lengkap (${firstIssue}). Silakan isi file .env.local sesuai .env.example.`,
    );
  }

  return parsed.data;
}

