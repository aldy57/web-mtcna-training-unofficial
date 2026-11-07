import { z } from "zod";

export const upsertMaterialSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2, "ID sumber materi minimal 2 karakter.")
    .max(32, "ID sumber materi maksimal 32 karakter.")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "ID sumber materi hanya boleh berisi huruf, angka, tanda minus (-), atau garis bawah (_).",
    ),
  title: z
    .string()
    .trim()
    .min(3, "Judul sumber materi minimal 3 karakter.")
    .max(250, "Judul sumber materi maksimal 250 karakter."),
  url: z
    .string()
    .trim()
    .url("URL sumber materi tidak valid.")
    .refine(
      (val) => val.startsWith("http://") || val.startsWith("https://"),
      "URL harus berawalan http:// atau https://.",
    ),
  description: z
    .string()
    .trim()
    .max(1000, "Deskripsi materi maksimal 1000 karakter.")
    .optional()
    .default(""),
});

export type UpsertMaterialInput = z.infer<typeof upsertMaterialSchema>;

export const deleteMaterialSchema = z.object({
  id: z.string().trim().min(1, "ID sumber materi wajib diisi."),
});

export type DeleteMaterialInput = z.infer<typeof deleteMaterialSchema>;

