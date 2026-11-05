import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { QuestionManagementPanel } from "@/components/admin/QuestionManagementPanel";
import { getAdminQuestions } from "@/lib/admin-repo";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Bank Soal · Panel Admin",
};

async function QuestionManagementContent() {
  await requireRole("admin");
  const questions = await getAdminQuestions();

  return (
    <div className="w-full space-y-6">
      {/* Navigasi Balik & Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Link href="/admin" className="hover:text-accent hover:underline">
            ← Kembali ke Ringkasan Admin
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">Bank Soal</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Kelola Bank Soal &amp; Kunci Jawaban
        </h1>
        <p className="text-sm text-muted">
          Sunting 50 soal kurasi dwibahasa (Indonesia &amp; English), kelola kunci
          jawaban tunggal/jamak, dan perbarui pembahasan materi RouterOS.
        </p>
      </div>

      <QuestionManagementPanel questions={questions} />
    </div>
  );
}

export default function AdminQuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-20 animate-pulse rounded-2xl bg-surface-soft" />
          <div className="h-96 animate-pulse rounded-2xl bg-surface-soft" />
        </div>
      }
    >
      <QuestionManagementContent />
    </Suspense>
  );
}

