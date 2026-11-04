import { z } from "zod";
import {
  OPTION_KEYS,
  QUESTION_KINDS,
  QUIZ_MODES,
  SUPPORTED_LANGUAGES,
} from "@/lib/constants";
import { TOPIC_KEYS } from "@/lib/topics";
import type { QuestionKind, Role } from "@/lib/types";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 80;

export const emailFieldSchema = z
  .email({ error: "Format email tidak valid." })
  .trim()
  .toLowerCase();

export const passwordFieldSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, {
    error: `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`,
  })
  .max(MAX_PASSWORD_LENGTH, {
    error: `Password maksimal ${MAX_PASSWORD_LENGTH} karakter.`,
  });

export const fullNameFieldSchema = z
  .string()
  .trim()
  .min(MIN_NAME_LENGTH, {
    error: `Nama lengkap minimal ${MIN_NAME_LENGTH} karakter.`,
  })
  .max(MAX_NAME_LENGTH, {
    error: `Nama lengkap maksimal ${MAX_NAME_LENGTH} karakter.`,
  });

export const loginSchema = z.object({
  email: emailFieldSchema,
  password: z.string().min(1, { error: "Password wajib diisi." }),
});

export const registerSchema = z
  .object({
    fullName: fullNameFieldSchema,
    email: emailFieldSchema,
    password: passwordFieldSchema,
    confirmPassword: z.string().min(1, {
      error: "Konfirmasi password wajib diisi.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak cocok.",
  });

export const updateProfileNameSchema = z.object({
  fullName: fullNameFieldSchema,
});

export const changeOwnPasswordSchema = z
  .object({
    newPassword: passwordFieldSchema,
    confirmPassword: z.string().min(1, {
      error: "Konfirmasi password wajib diisi.",
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password baru tidak cocok.",
  });

export const createAccountByAdminSchema = z.object({
  fullName: fullNameFieldSchema,
  email: emailFieldSchema,
  password: passwordFieldSchema,
  role: z.enum(["user", "admin"]),
});

export const resetParticipantPasswordSchema = z.object({
  targetUserId: z.uuid({ error: "ID pengguna tidak valid." }),
  newPassword: passwordFieldSchema,
});

export const deleteParticipantAccountSchema = z.object({
  targetUserId: z.uuid({ error: "ID pengguna tidak valid." }),
});

export const startAttemptSchema = z.object({
  mode: z.enum(QUIZ_MODES),
  language: z.enum(SUPPORTED_LANGUAGES),
  topic: z.enum(TOPIC_KEYS).optional(),
  parentAttemptId: z.uuid().optional(),
});

export const saveAnswerSchema = z.object({
  attemptId: z.uuid({ error: "ID sesi latihan tidak valid." }),
  questionId: z
    .string()
    .trim()
    .regex(/^[A-Z]\d{2}$/, { error: "ID soal tidak valid." }),
  selectedOptions: z.array(z.enum(OPTION_KEYS)),
  isSkipped: z.boolean().optional(),
});

export const toggleMarkSchema = z.object({
  attemptId: z.uuid({ error: "ID sesi latihan tidak valid." }),
  questionId: z
    .string()
    .trim()
    .regex(/^[A-Z]\d{2}$/, { error: "ID soal tidak valid." }),
});

export const finishAttemptSchema = z.object({
  attemptId: z.uuid({ error: "ID sesi latihan tidak valid." }),
});

const questionOptionsSchema = z.object({
  A: z.string().trim().min(1, { error: "Opsi A wajib diisi." }),
  B: z.string().trim().min(1, { error: "Opsi B wajib diisi." }),
  C: z.string().trim().min(1, { error: "Opsi C wajib diisi." }),
  D: z.string().trim().min(1, { error: "Opsi D wajib diisi." }),
});

export const upsertQuestionSchema = z
  .object({
    id: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]\d{2}$/, {
        error: "ID soal harus berformat huruf diikuti 2 digit (contoh: A01).",
      }),
    topic: z.enum(TOPIC_KEYS, { error: "Topik tidak valid." }),
    kind: z.enum(QUESTION_KINDS, { error: "Jenis soal tidak valid." }),
    sortOrder: z.coerce.number().int().min(1).max(500),
    answerKey: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[ABCD]{1,4}$/, {
        error: "Kunci jawaban hanya boleh berisi huruf A, B, C, atau D.",
      }),
    sourceIds: z
      .string()
      .trim()
      .min(1, { error: "Minimal satu ID referensi (contoh: S03)." }),
    bodyId: z.string().trim().min(5, { error: "Teks soal (ID) terlalu pendek." }),
    optionsId: questionOptionsSchema,
    explanationId: z
      .string()
      .trim()
      .min(5, { error: "Pembahasan (ID) terlalu pendek." }),
    bodyEn: z.string().trim().min(5, { error: "Teks soal (EN) terlalu pendek." }),
    optionsEn: questionOptionsSchema,
    explanationEn: z
      .string()
      .trim()
      .min(5, { error: "Pembahasan (EN) terlalu pendek." }),
  })
  .superRefine((data, context) => {
    const validationError = validateAnswerKeyForKind(data.kind, data.answerKey);
    if (validationError) {
      context.addIssue({
        code: "custom",
        path: ["answerKey"],
        message: validationError,
      });
    }
  });

export function validateAnswerKeyForKind(
  kind: QuestionKind,
  rawKey: string,
): string | null {
  const chars = rawKey.trim().toUpperCase().split("");
  const uniqueChars = new Set(chars);

  if (
    chars.length === 0 ||
    uniqueChars.size !== chars.length ||
    !chars.every((char) => OPTION_KEYS.includes(char as (typeof OPTION_KEYS)[number]))
  ) {
    return "Kunci jawaban harus berisi huruf opsi unik antara A sampai D.";
  }

  if (kind === "tunggal" && uniqueChars.size !== 1) {
    return "Soal jenis tunggal harus memiliki tepat 1 kunci jawaban.";
  }

  if (kind === "jamak" && uniqueChars.size < 2) {
    return "Soal jenis jamak harus memiliki minimal 2 kunci jawaban.";
  }

  return null;
}

export function canRoleTakeQuiz(role: Role): boolean {
  return role === "user";
}

export interface AdminTargetGuardInput {
  actorRole: Role;
  targetRole: Role;
  operation: "delete_account" | "reset_password";
}

/**
 * Aturan keamanan non-negotiable:
 * - Hanya admin yang boleh memanggil manajemen akun.
 * - Admin TIDAK PERNAH boleh menghapus akun admin atau mereset password akun admin.
 */
export function verifyAdminTargetModification(
  input: AdminTargetGuardInput,
): { allowed: true } | { allowed: false; status: 403; error: string } {
  if (input.actorRole !== "admin") {
    return {
      allowed: false,
      status: 403,
      error: "Akses ditolak. Hanya admin yang dapat mengelola akun.",
    };
  }

  if (input.targetRole === "admin") {
    const actionLabel =
      input.operation === "delete_account"
        ? "menghapus akun admin"
        : "mengubah password akun admin";
    return {
      allowed: false,
      status: 403,
      error: `Tindakan ditolak: Admin tidak diizinkan ${actionLabel}.`,
    };
  }

  return { allowed: true };
}

