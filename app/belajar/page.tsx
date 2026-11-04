import type { Metadata } from "next";
import { Suspense } from "react";
import { StudyLauncher } from "@/components/quiz/StudyLauncher";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Belajar per Topik",
};

async function StudyPageContent() {
  await requireRole("user");
  return <StudyLauncher />;
}

export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-80 animate-pulse rounded-2xl bg-surface-soft" />
      }
    >
      <StudyPageContent />
    </Suspense>
  );
}

