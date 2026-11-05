"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AiRecommendationCard } from "@/components/ai/AiRecommendationCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { StatusPopup } from "@/components/ui/PopupModal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { startAttemptAction } from "@/lib/actions/quiz-actions";
import {
  LANGUAGE_NAMES,
  PASSING_SCORE_PERCENT,
  SOLUTIONS_PAGE_SIZE,
} from "@/lib/constants";
import { formatScorePercent } from "@/lib/scoring";
import { TOPICS } from "@/lib/topics";
import type {
  AiQuotaStatus,
  Attempt,
  AttemptAnswer,
  QuestionWithSolution,
  QuizResultSummary,
  Role,
} from "@/lib/types";
import { SolutionNotice } from "./SolutionNotice";

export interface ResultSummaryProps {
  attempt: Attempt;
  summary: QuizResultSummary;
  questionsWithSolutions: readonly QuestionWithSolution[];
  answersByQuestionId: Readonly<Record<string, AttemptAnswer>>;
  viewerRole?: Role;
  initialRecommendation?: string | null;
  initialQuota?: AiQuotaStatus | null;
}

function buildResultLabel(attempt: Attempt): string {
  const langLabel = LANGUAGE_NAMES[attempt.language];
  if (attempt.mode === "tryout") {
    return `Tryout MTCNA · ${langLabel}`;
  }
  if (attempt.mode === "remedial") {
    return `Latihan Ulang Kesalahan · ${langLabel}`;
  }
  const topicLabel = attempt.topic ? TOPICS[attempt.topic] : "Belajar";
  return `${topicLabel} · ${langLabel}`;
}

export function ResultSummary({
  attempt,
  summary,
  questionsWithSolutions,
  answersByQuestionId,
  viewerRole = "user",
  initialRecommendation = null,
  initialQuota = null,
}: ResultSummaryProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"summary" | "solutions">(
    "summary",
  );
  const [solutionsPage, setSolutionsPage] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(
    1,
    Math.ceil(questionsWithSolutions.length / SOLUTIONS_PAGE_SIZE),
  );
  const pageItems = questionsWithSolutions.slice(
    solutionsPage * SOLUTIONS_PAGE_SIZE,
    (solutionsPage + 1) * SOLUTIONS_PAGE_SIZE,
  );

  const hasMistakes = summary.wrongCount + summary.blankCount > 0;

  function handleStartRemedial() {
    setErrorMessage("");
    startTransition(async () => {
      const parentId =
        attempt.mode === "remedial" && attempt.parentAttemptId
          ? attempt.parentAttemptId
          : attempt.id;

      const res = await startAttemptAction({
        mode: "remedial",
        language: attempt.language,
        parentAttemptId: parentId,
      });

      if (!res.ok) {
        setErrorMessage(res.error);
        return;
      }

      router.push(`/tryout/${res.data.attemptId}`);
    });
  }

  if (activeTab === "solutions") {
    return (
      <div className="w-full space-y-6 sm:space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              {buildResultLabel(attempt)}
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Pembahasan Soal
            </h1>
            <p className="text-xs text-muted">
              Halaman {solutionsPage + 1} dari {totalPages}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveTab("summary")}
          >
            Kembali ke Ringkasan Hasil
          </Button>
        </div>

        <div className="space-y-4">
          {pageItems.map((question, idx) => {
            const number = solutionsPage * SOLUTIONS_PAGE_SIZE + idx + 1;
            const userSelected =
              answersByQuestionId[question.id]?.selectedOptions ?? [];
            return (
              <Card key={question.id} className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="font-semibold text-foreground">
                    Soal {number} ({question.id})
                  </span>
                  <span>{TOPICS[question.topic]}</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {question.body}
                </p>
                <SolutionNotice
                  solution={question}
                  selectedOptions={userSelected}
                  attemptId={attempt.id}
                  language={attempt.language}
                  canUseAi={viewerRole === "user"}
                />
              </Card>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {solutionsPage > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                setSolutionsPage((p) => p - 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Sebelumnya
            </Button>
          )}
          {solutionsPage + 1 < totalPages && (
            <Button
              variant="secondary"
              onClick={() => {
                setSolutionsPage((p) => p + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Berikutnya
            </Button>
          )}
          <Button variant="primary" onClick={() => setActiveTab("summary")}>
            Kembali ke Hasil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              {buildResultLabel(attempt)}
            </p>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              {attempt.mode === "tryout"
                ? "Hasil Tryout MTCNA"
                : "Hasil Latihan"}
            </h1>
          </div>
          {attempt.mode === "tryout" && (
            <Badge variant={summary.hasPassed ? "success" : "caution"}>
              {summary.hasPassed ? "Lulus Latihan" : "Belum Lulus Latihan"}
            </Badge>
          )}
        </div>

        <div>
          <p className="text-xs text-muted">
            {attempt.mode === "tryout"
              ? "Nilai akhir"
              : "Persentase jawaban benar"}
          </p>
          <div
            className="text-5xl font-bold tracking-tight text-accent sm:text-6xl my-2"
            id="final-score"
          >
            {formatScorePercent(summary.scorePercent)}%
          </div>
          <p className="text-sm text-foreground">
            <strong>
              {summary.correctCount} dari {summary.totalQuestions} soal dijawab
              benar.
            </strong>{" "}
            {attempt.mode === "tryout"
              ? summary.hasPassed
                ? "Lulus latihan."
                : "Belum lulus latihan."
              : "Hasil ini merupakan latihan belajar."}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-xl bg-surface-soft p-4">
          <div>
            <strong className="block text-xl text-emerald-800">
              {summary.correctCount}
            </strong>
            <span className="text-xs text-muted">Benar</span>
          </div>
          <div>
            <strong className="block text-xl text-danger-ink">
              {summary.wrongCount}
            </strong>
            <span className="text-xs text-muted">Salah</span>
          </div>
          <div>
            <strong className="block text-xl text-muted">
              {summary.blankCount}
            </strong>
            <span className="text-xs text-muted">Belum dijawab</span>
          </div>
        </div>

        {attempt.mode === "tryout" && (
          <p className="text-xs text-muted">
            Batas lulus latihan: {PASSING_SCORE_PERCENT}%.{" "}
            {summary.isExpired
              ? "Jawaban dikumpulkan karena waktu habis."
              : "Jawaban dikumpulkan sebelum waktu habis."}
          </p>
        )}

        {attempt.mode === "remedial" && (
          <p className="text-xs text-muted">
            Nilai latihan ulang tidak mengubah hasil tryout sebelumnya.
          </p>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">
          Hasil per Topik
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="py-2.5 pr-4 font-semibold">Topik</th>
                <th className="py-2.5 px-4 font-semibold">Benar/Total</th>
                <th className="py-2.5 pl-4 font-semibold">Persentase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summary.topicBreakdown.map((row) => (
                <tr key={row.topic}>
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {row.topicLabel}
                  </td>
                  <td className="py-3 px-4 text-muted tabular-nums">
                    {row.correctCount}/{row.totalCount}
                  </td>
                  <td className="py-3 pl-4">
                    <div className="flex items-center gap-3">
                      <span className="min-w-12 font-semibold tabular-nums">
                        {formatScorePercent(row.scorePercent)}%
                      </span>
                      <div className="hidden sm:block w-28">
                        <ProgressBar
                          current={row.correctCount}
                          total={row.totalCount}
                          label={row.topicLabel}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Notice variant={summary.weakestTopics.length > 0 ? "caution" : "success"}>
        {summary.weakestTopics.length > 0 ? (
          <p>
            <strong>Pelajari kembali:</strong>{" "}
            {summary.weakestTopics.map((item) => item.topicLabel).join(", ")}.
            Gunakan pembahasan dan latihan ulang untuk memahami jawaban yang
            belum tepat.
          </p>
        ) : (
          <p>
            Seluruh soal pada sesi ini sudah dijawab benar. Lanjutkan latihan
            konfigurasi dan troubleshooting di lab RouterOS.
          </p>
        )}
      </Notice>

      {viewerRole === "user" && (
        <AiRecommendationCard
          attemptId={attempt.id}
          initialRecommendation={initialRecommendation}
          initialQuota={initialQuota}
        />
      )}

      {errorMessage && (
        <Notice variant="danger">
          <p>{errorMessage}</p>
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={() => {
            setSolutionsPage(0);
            setActiveTab("solutions");
          }}
        >
          Tinjau Pembahasan
        </Button>

        {hasMistakes && viewerRole === "user" && (
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={handleStartRemedial}
          >
            {isPending ? "Menyiapkan..." : "Latihan Ulang Kesalahan"}
          </Button>
        )}

        {attempt.mode === "remedial" && attempt.parentAttemptId && (
          <Link
            href={`/tryout/${attempt.parentAttemptId}/hasil`}
            className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-soft transition-colors"
          >
            Hasil Awal
          </Link>
        )}

        <Link
          href={viewerRole === "admin" ? "/admin" : "/dashboard"}
          className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-soft transition-colors"
        >
          {viewerRole === "admin" ? "Kembali ke Panel Admin" : "Ke Dashboard"}
        </Link>
      </div>

      <StatusPopup
        isOpen={Boolean(errorMessage)}
        status="error"
        title="Gagal Menyiapkan Latihan Ulang"
        message={errorMessage}
        onClose={() => setErrorMessage("")}
      />
    </div>
  );
}

