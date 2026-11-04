import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StudyLauncher } from "@/components/quiz/StudyLauncher";
import { requireRole } from "@/lib/auth";
import { isValidTopicKey } from "@/lib/topics";

export const metadata: Metadata = {
  title: "Latihan Topik",
};

async function TopicStudyContent({
  params,
}: {
  params: Promise<{ topik: string }>;
}) {
  await requireRole("user");
  const { topik } = await params;

  if (!isValidTopicKey(topik)) {
    notFound();
  }

  return <StudyLauncher initialTopic={topik} />;
}

export default function TopicStudyPage({
  params,
}: PageProps<"/belajar/[topik]">) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-64 animate-pulse rounded-2xl bg-surface-soft" />
      }
    >
      <TopicStudyContent params={params} />
    </Suspense>
  );
}

