import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { CertificationDisclaimerNotice } from "@/components/ui/Notice";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Panduan Latihan",
};

const GUIDE_SECTIONS = [
  {
    title: "Bahasa Soal (Dwibahasa)",
    body: "Pilih Bahasa Indonesia atau English sebelum memulai sesi. English sangat direkomendasikan karena ujian sertifikasi resmi MikroTik menggunakan bahasa Inggris. Kedua pilihan menyediakan 50 soal yang setara.",
  },
  {
    title: "Mode Belajar per Topik",
    body: "Pilih salah satu dari 9 topik MTCNA. Setelah memilih jawaban dan menekan Simpan Jawaban, jawaban dikunci dan sistem langsung menampilkan kunci jawaban, pembahasan konsep, serta tautan dokumentasi resmi MikroTik.",
  },
  {
    title: "Mode Tryout 50 Soal",
    body: "Kerjakan 50 soal dalam waktu 60 menit. Anda dapat berpindah antarsoal, menandai soal yang ragu, dan meninjau seluruh nomor soal sebelum mengumpulkan. Jika waktu habis, jawaban yang sudah disimpan akan dikumpulkan otomatis oleh server.",
  },
  {
    title: "Soal Pilihan Jamak",
    body: "Beberapa soal meminta Anda memilih semua jawaban yang benar. Klik semua opsi yang dianggap benar (atau gunakan pintasan keyboard A–D). Jawaban jamak dinilai benar hanya jika seluruh opsi benar terpilih tanpa ada opsi yang salah.",
  },
  {
    title: "Sistem Penilaian & Remedial",
    body: "Setiap soal bernilai sama (2% pada tryout 50 soal). Batas lulus latihan adalah 60%. Setelah selesai, Anda dapat meninjau pembahasan per 5 soal dan menjalankan Latihan Ulang Kesalahan (Remedial) untuk soal yang salah atau kosong.",
  },
  {
    title: "Penyimpanan Progres & Keamanan",
    body: "Seluruh progres jawaban dan sisa waktu tersimpan di database server pada akun Anda. Memuat ulang halaman tidak akan menghapus jawaban yang sudah disimpan.",
  },
] as const;

async function GuideContent() {
  const user = await getCurrentUser();

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Informasi &amp; Aturan
        </p>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Panduan Latihan &amp; Tryout MTCNA
        </h1>
        <p className="text-sm text-muted">
          Semua jawaban dipilih dengan mengklik tombol opsi (atau menekan tombol
          A, B, C, D pada keyboard), tanpa perlu mengetik.
        </p>
      </div>

      <Card className="divide-y divide-border p-0 overflow-hidden">
        {GUIDE_SECTIONS.map((item) => (
          <div key={item.title} className="p-5 sm:p-6 space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground">
              {item.title}
            </h2>
            <p className="text-sm text-muted leading-relaxed">{item.body}</p>
          </div>
        ))}
      </Card>

      <CertificationDisclaimerNotice />

      <div className="flex flex-wrap gap-3 pt-2">
        {user.role === "admin" ? (
          <Link
            href="/admin"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            Ke Beranda Admin
          </Link>
        ) : (
          <>
            <Link
              href="/tryout"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
            >
              Mulai Tryout
            </Link>
            <Link
              href="/belajar"
              className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-soft transition-colors"
            >
              Belajar per Topik
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full px-4 py-2.5 text-sm font-medium text-muted hover:bg-surface-soft hover:text-foreground transition-colors"
            >
              Ke Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full space-y-6 sm:space-y-8 animate-pulse">
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-surface-soft" />
            <div className="h-8 w-80 rounded bg-surface-soft" />
            <div className="h-4 w-96 max-w-full rounded bg-surface-soft" />
          </div>
          <div className="h-96 rounded-2xl bg-surface-soft" />
          <div className="h-20 rounded-2xl bg-surface-soft" />
          <div className="flex gap-3 pt-2">
            <div className="h-10 w-32 rounded-full bg-surface-soft" />
            <div className="h-10 w-36 rounded-full bg-surface-soft" />
          </div>
        </div>
      }
    >
      <GuideContent />
    </Suspense>
  );
}

