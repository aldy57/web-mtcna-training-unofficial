"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  CertificationDisclaimerNotice,
  Notice,
} from "@/components/ui/Notice";
import { StatusPopup } from "@/components/ui/PopupModal";
import { startAttemptAction } from "@/lib/actions/quiz-actions";
import { LANGUAGE_NAMES } from "@/lib/constants";
import type { Language } from "@/lib/types";
import { UI_STRINGS } from "@/lib/ui-strings";

export function TryoutLauncher() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("en");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleStartTryout() {
    setErrorMessage("");
    startTransition(async () => {
      const result = await startAttemptAction({
        mode: "tryout",
        language,
      });

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      router.push(`/tryout/${result.data.attemptId}`);
    });
  }

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Bahasa soal: {LANGUAGE_NAMES[language]}
        </p>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Tryout MTCNA — {LANGUAGE_NAMES[language]}
        </h1>
        <p className="text-sm text-muted">
          Bahasa yang dipilih berlaku untuk pertanyaan, pilihan jawaban, dan
          pembahasan. Kedua bahasa menggunakan{" "}
          <strong>50 soal yang setara</strong>.
        </p>
      </div>

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          Pilih Bahasa Soal Tryout
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            aria-pressed={language === "en"}
            onClick={() => setLanguage("en")}
            className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${
              language === "en"
                ? "border-2 border-accent bg-surface-selected"
                : "border-border bg-surface hover:bg-surface-soft"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                English
              </span>
              <Badge variant="success">Direkomendasikan</Badge>
            </div>
            <p className="mt-1 text-xs text-muted">
              Disarankan karena soal sertifikasi MTCNA menggunakan bahasa
              Inggris.
            </p>
          </button>

          <button
            type="button"
            aria-pressed={language === "id"}
            onClick={() => setLanguage("id")}
            className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${
              language === "id"
                ? "border-2 border-accent bg-surface-selected"
                : "border-border bg-surface hover:bg-surface-soft"
            }`}
          >
            <span className="text-sm font-semibold text-foreground">
              Bahasa Indonesia
            </span>
            <p className="mt-1 text-xs text-muted">
              Untuk memahami konsep, istilah, dan dasar-dasar RouterOS.
            </p>
          </button>
        </div>
      </Card>

      <Notice title={UI_STRINGS.tryoutSummaryBox}>
        <p>{UI_STRINGS.tryoutRulesBody1}</p>
        <p>{UI_STRINGS.tryoutRulesBody2}</p>
      </Notice>

      <CertificationDisclaimerNotice />

      {errorMessage && (
        <Notice variant="danger">
          <p>{errorMessage}</p>
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          variant="primary"
          disabled={isPending}
          onClick={handleStartTryout}
        >
          {isPending ? "Menyiapkan Sesi..." : "Mulai Tryout"}
        </Button>
        <Link
          href="/dashboard"
          className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-soft transition-colors"
        >
          Ke Dashboard
        </Link>
      </div>

      <StatusPopup
        isOpen={Boolean(errorMessage)}
        status="error"
        title="Gagal Memulai Tryout"
        message={errorMessage}
        onClose={() => setErrorMessage("")}
      />
    </div>
  );
}

