import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RecentAttemptsPanel } from "@/components/admin/RecentAttemptsPanel";
import { getAdminRecentAttempts } from "@/lib/admin-repo";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Aktivitas Tryout · Panel Admin",
};

async function RecentAttemptsContent() {
  await requireRole("admin");
  const attempts = await getAdminRecentAttempts(100);

  return (
    <div className="w-full space-y-6">
      {/* Navigasi Balik & Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Link href="/admin" className="hover:text-accent hover:underline">
            ← Kembali ke Ringkasan Admin
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">
            Aktivitas Tryout
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Hasil &amp; Aktivitas Latihan Peserta
        </h1>
        <p className="text-sm text-muted">
          Riwayat lengkap pengerjaan tryout dan latihan topik oleh seluruh
          peserta platform.
        </p>
      </div>

      <RecentAttemptsPanel attempts={attempts} />
    </div>
  );
}

export default function AdminAttemptsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-20 animate-pulse rounded-2xl bg-surface-soft" />
          <div className="h-96 animate-pulse rounded-2xl bg-surface-soft" />
        </div>
      }
    >
      <RecentAttemptsContent />
    </Suspense>
  );
}
