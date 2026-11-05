import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AiQuotaPanel } from "@/components/admin/AiQuotaPanel";
import { getAdminAiData } from "@/lib/admin-repo";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Layanan & Kuota AI · Panel Admin",
};

async function AiManagementContent() {
  await requireRole("admin");
  const aiData = await getAdminAiData();

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
            Layanan &amp; Kuota AI
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Manajemen Layanan &amp; Kuota AI
        </h1>
        <p className="text-sm text-muted">
          Pantau sisa kuota API global (GET /v1/quota), atur sakelar fitur AI,
          tambah/reset kuota peserta, dan bersihkan cache penjelasan soal.
        </p>
      </div>

      <AiQuotaPanel
        initialGlobalStatus={aiData.aiGlobalStatus}
        initialDynamicSettings={aiData.dynamicSettings}
        participants={aiData.participants}
        initialQuotas={aiData.participantQuotas}
        cachedExplanationCount={aiData.cachedExplanationCount}
      />
    </div>
  );
}

export default function AdminAiPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-20 animate-pulse rounded-2xl bg-surface-soft" />
          <div className="h-96 animate-pulse rounded-2xl bg-surface-soft" />
        </div>
      }
    >
      <AiManagementContent />
    </Suspense>
  );
}

