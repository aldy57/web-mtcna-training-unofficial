"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog, StatusPopup } from "@/components/ui/PopupModal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  finishAttemptAction,
  saveAnswerAction,
  toggleMarkAction,
} from "@/lib/actions/quiz-actions";
import { LANGUAGE_NAMES, OPTION_KEYS } from "@/lib/constants";
import { TOPICS } from "@/lib/topics";
import type {
  Attempt,
  AttemptAnswer,
  OptionKey,
  QuestionPublic,
  QuestionWithSolution,
} from "@/lib/types";
import { OptionButton } from "./OptionButton";
import { QuestionGrid } from "./QuestionGrid";
import { SolutionNotice } from "./SolutionNotice";
import { Timer } from "./Timer";

export interface QuestionCardProps {
  attempt: Attempt;
  questions: readonly QuestionPublic[];
  initialAnswers: Readonly<Record<string, AttemptAnswer>>;
  initialUnlockedSolutions: Readonly<Record<string, QuestionWithSolution>>;
}

type RunnerView = "question" | "review" | "confirm" | "exit";

function buildSessionTitle(attempt: Attempt): string {
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

export function QuestionCard({
  attempt,
  questions,
  initialAnswers,
  initialUnlockedSolutions,
}: QuestionCardProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [view, setView] = useState<RunnerView>("question");
  const [answersByQuestionId, setAnswersByQuestionId] =
    useState<Record<string, AttemptAnswer>>(initialAnswers);
  const [unlockedSolutions, setUnlockedSolutions] = useState<
    Record<string, QuestionWithSolution>
  >(initialUnlockedSolutions);

  const currentQuestion = questions[currentIndex];
  const savedAnswer = currentQuestion
    ? answersByQuestionId[currentQuestion.id]
    : undefined;

  const [draft, setDraft] = useState<OptionKey[]>(
    () => savedAnswer?.selectedOptions ?? [],
  );
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorPopupMessage, setErrorPopupMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const isTryout = attempt.mode === "tryout";
  const isLocked =
    !isTryout &&
    Boolean(
      currentQuestion &&
        (unlockedSolutions[currentQuestion.id] ||
          answersByQuestionId[currentQuestion.id]),
    );

  const goToQuestion = useCallback(
    (index: number) => {
      const target = questions[index];
      if (!target) {
        return;
      }
      setCurrentIndex(index);
      setDraft(answersByQuestionId[target.id]?.selectedOptions ?? []);
      setStatusMessage("");
      setView("question");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [answersByQuestionId, questions],
  );

  const handleToggleOption = useCallback(
    (key: OptionKey) => {
      if (!currentQuestion || isLocked || isPending) {
        return;
      }
      setStatusMessage("");
      setDraft((prev) => {
        if (currentQuestion.kind === "tunggal") {
          return [key];
        }
        return prev.includes(key)
          ? prev.filter((item) => item !== key)
          : [...prev, key].sort();
      });
    },
    [currentQuestion, isLocked, isPending],
  );

  const handleFinishSession = useCallback(() => {
    startTransition(async () => {
      const res = await finishAttemptAction({ attemptId: attempt.id });
      if (res.ok) {
        router.push(`/tryout/${attempt.id}/hasil`);
        router.refresh();
      } else {
        setStatusMessage(res.error);
        setErrorPopupMessage(res.error);
      }
    });
  }, [attempt.id, router]);

  useEffect(() => {
    if (view !== "question") {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const upperKey = event.key.toUpperCase();
      if (OPTION_KEYS.includes(upperKey as OptionKey)) {
        event.preventDefault();
        handleToggleOption(upperKey as OptionKey);
      } else if (isTryout && event.key === "ArrowLeft" && currentIndex > 0) {
        event.preventDefault();
        goToQuestion(currentIndex - 1);
      } else if (
        isTryout &&
        event.key === "ArrowRight" &&
        currentIndex < questions.length - 1
      ) {
        event.preventDefault();
        goToQuestion(currentIndex + 1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentIndex,
    goToQuestion,
    handleToggleOption,
    isTryout,
    questions.length,
    view,
  ]);

  function handleSave(isSkipped: boolean = false) {
    if (!currentQuestion || isLocked) {
      return;
    }
    if (!isSkipped && draft.length === 0) {
      setStatusMessage(
        "Pilih jawaban terlebih dahulu, atau gunakan tombol Lewati bila tersedia.",
      );
      return;
    }

    startTransition(async () => {
      const result = await saveAnswerAction({
        attemptId: attempt.id,
        questionId: currentQuestion.id,
        selectedOptions: isSkipped ? [] : draft,
        isSkipped,
      });

      if (!result.ok) {
        setStatusMessage(result.error);
        setErrorPopupMessage(result.error);
        return;
      }

      if (result.data.isExpired) {
        router.push(`/tryout/${attempt.id}/hasil`);
        router.refresh();
        return;
      }

      const nextAnswers: Record<string, AttemptAnswer> = {
        ...answersByQuestionId,
        [currentQuestion.id]: {
          attemptId: attempt.id,
          questionId: currentQuestion.id,
          selectedOptions: result.data.selectedOptions,
          isMarked: answersByQuestionId[currentQuestion.id]?.isMarked ?? false,
          isCorrect: null,
        },
      };
      setAnswersByQuestionId(nextAnswers);

      if (result.data.unlockedSolution) {
        setUnlockedSolutions((prev) => ({
          ...prev,
          [currentQuestion.id]: result.data.unlockedSolution!,
        }));
      }

      if (isTryout) {
        if (currentIndex < questions.length - 1) {
          const nextIdx = currentIndex + 1;
          const nextQuestion = questions[nextIdx];
          setCurrentIndex(nextIdx);
          setDraft(
            nextQuestion
              ? (nextAnswers[nextQuestion.id]?.selectedOptions ?? [])
              : [],
          );
          setStatusMessage("");
        } else {
          setView("review");
        }
      } else {
        if (isSkipped) {
          setDraft([]);
        }
        setStatusMessage("Jawaban sudah dinilai.");
      }
    });
  }

  function handleToggleMark() {
    if (!currentQuestion || !isTryout) {
      return;
    }
    startTransition(async () => {
      const result = await toggleMarkAction({
        attemptId: attempt.id,
        questionId: currentQuestion.id,
      });
      if (!result.ok) {
        setStatusMessage(result.error);
        setErrorPopupMessage(result.error);
        return;
      }
      setAnswersByQuestionId((prev) => ({
        ...prev,
        [currentQuestion.id]: {
          attemptId: attempt.id,
          questionId: currentQuestion.id,
          selectedOptions: prev[currentQuestion.id]?.selectedOptions ?? [],
          isMarked: result.data.isMarked,
          isCorrect: null,
        },
      }));
    });
  }

  function handleNextInStudy() {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
    } else {
      handleFinishSession();
    }
  }

  const answeredCount = Object.values(answersByQuestionId).filter(
    (ans) => ans.selectedOptions.length > 0,
  ).length;
  const blankCount = questions.length - answeredCount;
  const sessionTitle = buildSessionTitle(attempt);

  if (view === "review") {
    return (
      <Card className="w-full space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold text-foreground">
            Tinjau Jawaban
          </h1>
          <p className="text-sm text-muted">
            Klik nomor untuk membuka soal. Latar berwarna berarti sudah dijawab;
            garis tebal berarti ditandai.
          </p>
        </div>

        <QuestionGrid
          questions={questions}
          answersByQuestionId={answersByQuestionId}
          currentIndex={currentIndex}
          onSelectIndex={goToQuestion}
        />

        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="primary" onClick={() => setView("confirm")}>
            Kumpulkan Tryout
          </Button>
          <Button variant="secondary" onClick={() => setView("question")}>
            Kembali ke Soal
          </Button>
          <Button variant="ghost" onClick={() => setView("exit")}>
            Keluar Latihan
          </Button>
        </div>
      </Card>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const isMultiChoice = currentQuestion.kind === "jamak";
  const isCurrentMarked = Boolean(
    answersByQuestionId[currentQuestion.id]?.isMarked,
  );
  const currentSolution = unlockedSolutions[currentQuestion.id];

  return (
    <div className="w-full grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted">
            <span className="font-medium text-foreground">{sessionTitle}</span>{" "}
            · Soal {currentIndex + 1} dari {questions.length} ·{" "}
            <span>{answeredCount} tersimpan</span>
          </div>
          {isTryout && attempt.deadlineAt && (
            <Timer
              deadlineAtIso={attempt.deadlineAt}
              isFinished={attempt.status !== "in_progress"}
              onExpire={handleFinishSession}
            />
          )}
        </div>

        <ProgressBar
          current={currentIndex + 1}
          total={questions.length}
          label={`Soal ${currentIndex + 1} dari ${questions.length}`}
        />

        <Card className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              {TOPICS[currentQuestion.topic]}
            </p>
            <h2 className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
              {currentQuestion.body}
            </h2>
            <p className="text-xs text-muted">
              {isMultiChoice
                ? "Pilih semua jawaban yang benar. Klik lagi untuk membatalkan pilihan."
                : "Pilih satu jawaban."}{" "}
              Klik Simpan Jawaban agar pilihan tercatat (pintasan tombol A–D).
            </p>
          </div>

          <div
            className="grid gap-2.5"
            role="group"
            aria-label="Pilihan jawaban"
          >
            {OPTION_KEYS.map((optionKey) => (
              <OptionButton
                key={optionKey}
                optionKey={optionKey}
                label={currentQuestion.options[optionKey]}
                isSelected={draft.includes(optionKey)}
                isDisabled={isLocked || isPending}
                onSelect={handleToggleOption}
              />
            ))}
          </div>

          <div
            className="min-h-5 text-xs font-medium text-amber-800"
            role="status"
          >
            {statusMessage ||
              (isLocked
                ? "Jawaban sudah dinilai."
                : draft.length > 0
                  ? `Pilihan: ${draft.join(", ")}`
                  : "Belum ada pilihan.")}
          </div>

          {isLocked && currentSolution && (
            <SolutionNotice
              solution={currentSolution}
              selectedOptions={
                answersByQuestionId[currentQuestion.id]?.selectedOptions ?? []
              }
            />
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {!isLocked ? (
              <Button
                variant="primary"
                disabled={isPending}
                onClick={() => handleSave(false)}
              >
                {isPending ? "Menyimpan..." : "Simpan Jawaban"}
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={isPending}
                onClick={handleNextInStudy}
              >
                {currentIndex === questions.length - 1
                  ? "Lihat Hasil"
                  : "Lanjutkan"}
              </Button>
            )}

            {isTryout ? (
              <>
                {currentIndex > 0 && (
                  <Button
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => goToQuestion(currentIndex - 1)}
                  >
                    Sebelumnya
                  </Button>
                )}
                {currentIndex < questions.length - 1 && (
                  <Button
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => goToQuestion(currentIndex + 1)}
                  >
                    Berikutnya
                  </Button>
                )}
                <Button
                  variant="secondary"
                  disabled={isPending}
                  onClick={handleToggleMark}
                >
                  {isCurrentMarked ? "Hapus Tanda" : "Tandai"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => setView("review")}
                >
                  Tinjau
                </Button>
                <Button
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => setView("confirm")}
                >
                  Kumpulkan
                </Button>
              </>
            ) : (
              !isLocked && (
                <Button
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => handleSave(true)}
                >
                  Lewati
                </Button>
              )
            )}
          </div>

          <div className="border-t border-border pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("exit")}
            >
              Keluar Latihan
            </Button>
          </div>
        </Card>
      </div>

      <aside className="lg:col-span-4">
        <Card className="sticky top-24">
          <QuestionGrid
            questions={questions}
            answersByQuestionId={answersByQuestionId}
            currentIndex={currentIndex}
            onSelectIndex={goToQuestion}
          />
        </Card>
      </aside>

      <ConfirmDialog
        isOpen={view === "confirm"}
        title="Konfirmasi Kumpulkan Tryout"
        description={`${answeredCount} soal sudah dijawab dan ${blankCount} soal masih kosong. Setelah dikumpulkan, jawaban tidak dapat diubah kembali.`}
        confirmLabel="Ya, Kumpulkan"
        cancelLabel="Kembali"
        variant="primary"
        isLoading={isPending}
        onConfirm={handleFinishSession}
        onCancel={() => setView("question")}
      />

      <ConfirmDialog
        isOpen={view === "exit"}
        title="Keluar dari Latihan?"
        description="Jawaban yang sudah Anda klik Simpan Jawaban tetap tercatat di akun Anda. Apakah Anda yakin ingin keluar ke Dashboard sekarang?"
        confirmLabel="Ya, Keluar ke Dashboard"
        cancelLabel="Kembali ke Soal"
        variant="danger"
        onConfirm={() => router.push("/dashboard")}
        onCancel={() => setView("question")}
      />

      <StatusPopup
        isOpen={Boolean(errorPopupMessage)}
        status="error"
        title="Gagal Memproses Jawaban"
        message={errorPopupMessage}
        onClose={() => setErrorPopupMessage("")}
      />
    </div>
  );
}

