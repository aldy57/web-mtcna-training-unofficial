import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const RANDOM_EMAIL_BYTES = 4;
const RANDOM_PASSWORD_BYTES = 12;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("your-") || value.includes("your-project-id")) {
    throw new Error(
      `Variabel environment ${name} belum diisi dengan benar di .env.local.`,
    );
  }
  return value;
}

function generateRandomCredentials(): { email: string; password: string } {
  const suffix = randomBytes(RANDOM_EMAIL_BYTES).toString("hex");
  const password = randomBytes(RANDOM_PASSWORD_BYTES).toString("base64url");
  return {
    email: `admin-${suffix}@mtcna.local`,
    password,
  };
}

async function createInitialAdmin(): Promise<void> {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { email, password } = generateRandomCredentials();
  const fullName = "Administrator MTCNA";

  const { data: createdAuth, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

  if (createError || !createdAuth.user) {
    throw new Error(
      `Gagal membuat akun admin di Supabase Auth: ${createError?.message ?? "Unknown error"}`,
    );
  }

  const userId = createdAuth.user.id;

  // Hapus baris default 'user' hasil trigger lalu insert sebagai 'admin'
  // (aman terhadap trigger BEFORE UPDATE prevent_profile_role_change)
  await supabase.from("profiles").delete().eq("id", userId);

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    email,
    full_name: fullName,
    role: "admin",
  });

  if (profileError) {
    throw new Error(
      `Gagal menetapkan role admin di tabel profiles: ${profileError.message}`,
    );
  }

  await supabase.from("admin_audit_log").insert({
    admin_id: userId,
    action: "BOOTSTRAP_ADMIN",
    target_id: userId,
    details: { email, note: "Initial admin created via CLI script" },
  });

  process.stdout.write("\n=== AKUN ADMIN BARU BERHASIL DIBUAT ===\n");
  process.stdout.write(`Email    : ${email}\n`);
  process.stdout.write(`Password : ${password}\n`);
  process.stdout.write(
    "Simpan kredensial di atas sekarang dan segera ganti password melalui menu /akun.\n\n",
  );
}

createInitialAdmin().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error create-admin: ${message}\n`);
  process.exit(1);
});

