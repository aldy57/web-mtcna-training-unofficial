import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { getAttemptSessionForUser } from "@/lib/attempts-repo";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Pengerjaan Soal",
};

async function AttemptRunnerContent({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const user = await requireRole("user");
  const { attemptId } = await params;

  const session = await getAttemptSessionForUser(attemptId, user.id, false);

  if (!session) {
    notFound();
  }

  if (session.attempt.status !== "in_progress") {
    redirect(`/tryout/${attemptId}/hasil`);
  }

  return (
    <QuestionCard
      attempt={session.attempt}
      questions={session.questions}
      initialAnswers={session.answersByQuestionId}
      initialUnlockedSolutions={session.unlockedSolutionsByQuestionId}
    />
  );
}

export default function AttemptPage({
  params,
}: PageProps<"/tryout/[attemptId]">) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 h-96 animate-pulse rounded-2xl bg-surface-soft" />
          <div className="lg:col-span-4 h-72 animate-pulse rounded-2xl bg-surface-soft" />
        </div>
      }
    >
      <AttemptRunnerContent params={params} />
    </Suspense>
  );
}

