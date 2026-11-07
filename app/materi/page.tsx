import type { Metadata } from "next";
import { Suspense } from "react";
import { MaterialListView } from "@/components/materials/MaterialListView";
import { getCurrentUser } from "@/lib/auth";
import { getAllMaterials } from "@/lib/materials-repo";

export const metadata: Metadata = {
  title: "Sumber Materi",
  description:
    "Koleksi sumber dan dokumentasi resmi MikroTik RouterOS yang digunakan dalam modul pembelajaran dan pembahasan soal sertifikasi MTCNA.",
};

async function MaterialContent() {
  await getCurrentUser();
  const materials = await getAllMaterials();

  return <MaterialListView materials={materials} />;
}

export default function MaterialPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full space-y-4">
          <div className="h-20 w-1/2 animate-pulse rounded-2xl bg-surface-soft" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-36 w-full animate-pulse rounded-2xl bg-surface-soft"
              />
            ))}
          </div>
        </div>
      }
    >
      <MaterialContent />
    </Suspense>
  );
}

