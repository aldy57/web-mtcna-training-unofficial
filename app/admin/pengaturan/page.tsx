import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminBrandingManager } from "@/components/admin/AdminBrandingManager";
import { requireRole } from "@/lib/auth";
import { getAppBranding } from "@/lib/branding-repo";

export const metadata: Metadata = {
  title: "Pengaturan Web · Panel Admin",
};

async function BrandingSettingsContent() {
  await requireRole("admin");
  const branding = await getAppBranding();

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
            Pengaturan Web
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Pengaturan Branding &amp; Logo Web
        </h1>
        <p className="text-sm text-muted">
          Kustomisasi nama situs, judul aplikasi, dan logo/ikon yang tampil pada bilah navigasi serta halaman otentikasi.
        </p>
      </div>

      <AdminBrandingManager initialBranding={branding} />
    </div>
  );
}

function SettingsLoading() {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-40 animate-pulse rounded-md bg-surface-soft" />
        <div className="h-8 w-72 animate-pulse rounded-md bg-surface-soft" />
        <div className="h-4 w-96 animate-pulse rounded-md bg-surface-soft" />
      </div>
      <div className="h-96 rounded-2xl border border-border bg-surface-soft animate-pulse" />
    </div>
  );
}

export default function AdminBrandingPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <BrandingSettingsContent />
    </Suspense>
  );
}

