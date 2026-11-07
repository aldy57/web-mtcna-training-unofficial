import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminMaterialManager } from "@/components/admin/AdminMaterialManager";
import { requireRole } from "@/lib/auth";
import { getAllMaterials, getMaterialUsageMap } from "@/lib/materials-repo";

export const metadata: Metadata = {
  title: "Kelola Sumber Materi · Panel Admin",
};

async function AdminMaterialContent() {
  await requireRole("admin");
  const [materials, usageMap] = await Promise.all([
    getAllMaterials(),
    getMaterialUsageMap(),
  ]);

  return <AdminMaterialManager initialMaterials={materials} usageMap={usageMap} />;
}

export default function AdminMaterialPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full space-y-4">
          <div className="h-16 w-1/3 animate-pulse rounded-2xl bg-surface-soft" />
          <div className="h-96 w-full animate-pulse rounded-2xl bg-surface-soft" />
        </div>
      }
    >
      <AdminMaterialContent />
    </Suspense>
  );
}

