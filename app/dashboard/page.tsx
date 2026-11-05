import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getUserDashboardStats } from "@/lib/attempts-repo";
import { requireRole } from "@/lib/auth";
import { LANGUAGE_NAMES, PASSING_SCORE_PERCENT } from "@/lib/constants";
import { formatScorePercent, hasPassedTryout } from "@/lib/scoring";
import { TOPICS, TOPIC_KEYS } from "@/lib/topics";
import type { Attempt } from "@/lib/types";

export const metadata: Metadata = {
  title: "Dashboard Peserta",
};

function formatAttemptLabel(attempt: Attempt): string {
  if (attempt.mode === "tryout") {
    return "Tryout 50 Soal";
  }
  if (attempt.mode === "remedial") {
    return "Latihan Ulang (Remedial)";
  }
  return attempt.topic ? `Belajar: ${TOPICS[attempt.topic]}` : "Belajar Topik";
}

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

async function DashboardContent() {
  const user = await requireRole("user");
  const stats = await getUserDashboardStats(user.id);

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Dashboard Akun
          </p>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Halo, {user.fullName || user.email}
          </h1>
          <p className="text-sm text-muted">
            Pantau penguasaan 9 topik MTCNA dan riwayat simulasi tryout Anda.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/tryout"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            Mulai Tryout
          </Link>
          <Link
            href="/belajar"
            className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-soft transition-colors"
          >
            Belajar per Topik
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="space-y-1">
          <span className="text-xs text-muted">Tryout Selesai</span>
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {stats.totalTryouts}
          </p>
          <span className="text-xs text-muted">Total Tryout</span>
        </Card>

        <Card className="space-y-1">
          <span className="text-xs text-muted">Nilai Tryout Terakhir</span>
          <p className="text-3xl font-bold text-accent tabular-nums">
            {stats.latestTryoutScore !== null
              ? `${formatScorePercent(stats.latestTryoutScore)}%`
              : "—"}
          </p>
          <span className="text-xs text-muted">
            Batas lulus latihan {PASSING_SCORE_PERCENT}%
          </span>
        </Card>

        <Card className="space-y-1">
          <span className="text-xs text-muted">Nilai Tryout Tertinggi</span>
          <div className="flex items-center gap-2.5">
            <p className="text-3xl font-bold text-emerald-800 tabular-nums">
              {stats.bestTryoutScore !== null
                ? `${formatScorePercent(stats.bestTryoutScore)}%`
                : "—"}
            </p>
            {stats.bestTryoutScore !== null && (
              <Badge
                variant={
                  hasPassedTryout(stats.bestTryoutScore) ? "success" : "caution"
                }
              >
                {hasPassedTryout(stats.bestTryoutScore)
                  ? "Lulus"
                  : "Perlu Latihan"}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted">Pencapaian terbaik Anda</span>
        </Card>
      </section>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Grafik Progres Penguasaan per Topik
            </h2>
            <p className="text-xs text-muted">
              Akumulasi jawaban benar dari seluruh sesi belajar yang
              telah selesai.
            </p>
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          {TOPIC_KEYS.map((topicKey) => {
            const mastery = stats.topicMastery[topicKey];
            const label = TOPICS[topicKey];
            return (
              <div
                key={topicKey}
                className="rounded-xl border border-border bg-surface-soft/50 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <Link
                    href={`/belajar/${topicKey}`}
                    className="font-semibold text-foreground hover:text-accent"
                  >
                    {label}
                  </Link>
                  <span className="tabular-nums text-muted">
                    {mastery.total > 0
                      ? `${mastery.correct}/${mastery.total} (${formatScorePercent(mastery.percent)}%)`
                      : "Belum dikerjakan"}
                  </span>
                </div>
                <ProgressBar
                  current={mastery.correct}
                  total={mastery.total > 0 ? mastery.total : 1}
                  label={`Penguasaan ${label}`}
                />
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">
          Riwayat Sesi Terakhir
        </h2>

        {stats.recentAttempts.length === 0 ? (
          <p className="text-sm text-muted py-4">
            Belum ada riwayat latihan. Pilih{" "}
            <Link href="/belajar" className="font-semibold text-accent">
              Belajar per Topik
            </Link>{" "}
            atau{" "}
            <Link href="/tryout" className="font-semibold text-accent">
              Tryout
            </Link>{" "}
            untuk memulai.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-2.5 pr-4 font-semibold">Sesi</th>
                  <th className="py-2.5 px-3 font-semibold">Bahasa</th>
                  <th className="py-2.5 px-3 font-semibold">Waktu Mulai</th>
                  <th className="py-2.5 px-3 font-semibold">Nilai</th>
                  <th className="py-2.5 pl-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recentAttempts.map((item) => {
                  const isOngoing = item.status === "in_progress";
                  const targetHref = isOngoing
                    ? `/tryout/${item.id}`
                    : `/tryout/${item.id}/hasil`;

                  return (
                    <tr key={item.id}>
                      <td className="py-3 pr-4 font-medium text-foreground">
                        {formatAttemptLabel(item)}
                      </td>
                      <td className="py-3 px-3 text-xs text-muted">
                        {LANGUAGE_NAMES[item.language]}
                      </td>
                      <td className="py-3 px-3 text-xs text-muted">
                        {formatShortDate(item.startedAt)}
                      </td>
                      <td className="py-3 px-3 tabular-nums">
                        {isOngoing ? (
                          <Badge variant="caution">Sedang Berjalan</Badge>
                        ) : item.scorePercent !== null ? (
                          <span className="font-semibold text-foreground">
                            {formatScorePercent(item.scorePercent)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <Link
                          href={targetHref}
                          className="inline-flex items-center rounded-full border border-border bg-surface px-3.5 py-1 text-xs font-medium text-foreground hover:border-accent hover:text-accent transition-colors"
                        >
                          {isOngoing ? "Lanjutkan" : "Lihat Hasil"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-20 animate-pulse rounded-2xl bg-surface-soft" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-28 animate-pulse rounded-2xl bg-surface-soft" />
            <div className="h-28 animate-pulse rounded-2xl bg-surface-soft" />
            <div className="h-28 animate-pulse rounded-2xl bg-surface-soft" />
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-surface-soft" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

