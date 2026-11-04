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
import { TOPICS } from "@/lib/topics";
import type { Language, TopicKey } from "@/lib/types";

export interface StudyLauncherProps {
  initialTopic?: TopicKey;
}

export function StudyLauncher({ initialTopic }: StudyLauncherProps) {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("en");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const topicEntries = Object.entries(TOPICS) as [TopicKey, string][];

  function handleStartTopic(topicKey: TopicKey) {
    setErrorMessage("");
    startTransition(async () => {
      const result = await startAttemptAction({
        mode: "belajar",
        language,
        topic: topicKey,
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
          Belajar per Topik · {LANGUAGE_NAMES[language]}
        </p>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {initialTopic
            ? `Latihan Topik: ${TOPICS[initialTopic]}`
            : "Pilih Bahasa & Topik Belajar"}
        </h1>
        <p className="text-sm text-muted">
          Pembahasan konsep dan kunci jawaban ditampilkan langsung setelah setiap
          jawaban disimpan.
        </p>
      </div>

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          1. Pilih Bahasa Soal
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
              Disarankan karena soal sertifikasi resmi MTCNA menggunakan bahasa
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
              Untuk memahami konsep, istilah, dan dasar-dasar konfigurasi
              RouterOS.
            </p>
          </button>
        </div>
      </Card>

      {errorMessage && (
        <Notice variant="danger">
          <p>{errorMessage}</p>
        </Notice>
      )}

      {initialTopic ? (
        <Card className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              Siap mempelajari modul {TOPICS[initialTopic]}?
            </h2>
            <p className="text-xs text-muted">
              Bahasa soal aktif: {LANGUAGE_NAMES[language]}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              disabled={isPending}
              onClick={() => handleStartTopic(initialTopic)}
            >
              {isPending ? "Memulai..." : `Mulai Latihan ${TOPICS[initialTopic]}`}
            </Button>
            <Link
              href="/belajar"
              className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-soft transition-colors"
            >
              Lihat Semua Topik
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            2. Pilih Topik MTCNA
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {topicEntries.map(([topicKey, topicLabel]) => (
              <button
                key={topicKey}
                type="button"
                disabled={isPending}
                onClick={() => handleStartTopic(topicKey)}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 text-left text-sm font-medium text-foreground transition-all hover:border-accent hover:bg-surface-soft cursor-pointer disabled:opacity-50"
              >
                <span>{topicLabel}</span>
                <span className="text-xs font-semibold text-accent">
                  Mulai →
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <CertificationDisclaimerNotice />

      <StatusPopup
        isOpen={Boolean(errorMessage)}
        status="error"
        title="Gagal Memulai Latihan"
        message={errorMessage}
        onClose={() => setErrorMessage("")}
      />
    </div>
  );
}

