import type { Metadata } from "next";
import { Suspense } from "react";
import { TryoutLauncher } from "@/components/quiz/TryoutLauncher";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Persiapan Tryout 50 Soal",
};

async function TryoutPreparationContent() {
  await requireRole("user");
  return <TryoutLauncher />;
}

export default function TryoutPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-80 animate-pulse rounded-2xl bg-surface-soft" />
      }
    >
      <TryoutPreparationContent />
    </Suspense>
  );
}

