import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ResultSummary } from "@/components/quiz/ResultSummary";
import { getUserAiQuotaStatus } from "@/lib/ai/quota";
import { getSavedAiRecommendation } from "@/lib/ai/recommendation-service";
import { getCompletedAttemptReport } from "@/lib/attempts-repo";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Hasil & Pembahasan",
};

async function AttemptResultContent({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const user = await getCurrentUser();
  const { attemptId } = await params;

  const report = await getCompletedAttemptReport(
    attemptId,
    user.id,
    user.role === "admin",
  );

  if (!report) {
    if (user.role === "admin") {
      redirect("/admin");
    }
    // Jika attempt masih in_progress milik peserta, arahkan kembali ke halaman pengerjaan
    redirect(`/tryout/${attemptId}`);
  }

  if (report.questionsWithSolutions.length === 0) {
    notFound();
  }

  const [savedRecommendation, userQuota] =
    user.role === "user"
      ? await Promise.all([
          getSavedAiRecommendation(attemptId),
          getUserAiQuotaStatus(user.id),
        ])
      : [null, null];

  return (
    <ResultSummary
      attempt={report.attempt}
      summary={report.summary}
      questionsWithSolutions={report.questionsWithSolutions}
      answersByQuestionId={report.answersByQuestionId}
      viewerRole={user.role}
      initialRecommendation={savedRecommendation?.content ?? null}
      initialQuota={userQuota}
    />
  );
}


export default function AttemptResultPage({
  params,
}: PageProps<"/tryout/[attemptId]/hasil">) {
  return (
    <Suspense
      fallback={
        <div className="w-full space-y-5">
          <div className="h-56 animate-pulse rounded-2xl bg-surface-soft" />
          <div className="h-72 animate-pulse rounded-2xl bg-surface-soft" />
        </div>
      }
    >
      <AttemptResultContent params={params} />
    </Suspense>
  );
}

