import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionMenu } from "@/components/ui/ActionMenu";
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

function PlayIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function BookIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 2v20" />
    </svg>
  );
}

function ChecklistIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function TargetIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function AwardIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

function ChartBarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function HistoryIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function FileTextIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

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
      {/* Header Utama: Sambutan Pengguna & Tombol Cepat */}
      <section className="flex flex-wrap items-center justify-between gap-4 animate-fade-in-up">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Dashboard Akun
          </p>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl tracking-tight">
            Halo, {user.fullName || user.email}
          </h1>
          <p className="text-sm text-muted">
            Pantau penguasaan 9 topik MTCNA dan riwayat simulasi tryout Anda.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/tryout"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-2xs hover:bg-accent-hover hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 transition-all duration-150"
          >
            <PlayIcon className="h-3.5 w-3.5" />
            <span>Mulai Tryout</span>
          </Link>
          <Link
            href="/belajar"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-soft hover:border-border/80 hover:-translate-y-0.5 hover:shadow-2xs active:translate-y-0 transition-all duration-150"
          >
            <BookIcon className="h-3.5 w-3.5 text-muted" />
            <span>Belajar per Topik</span>
          </Link>
        </div>
      </section>

      {/* Tiga Kartu Metrik Ringkasan dengan Hover & Ikon Interaktif */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="group relative space-y-2 transition-all duration-200 hover:border-accent/40 hover:shadow-xs animate-fade-in-up animation-delay-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Tryout Selesai</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-soft text-muted group-hover:bg-accent/10 group-hover:text-accent transition-colors">
              <ChecklistIcon />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground tabular-nums tracking-tight">
            {stats.totalTryouts}
          </p>
          <span className="text-xs text-muted">Total Tryout</span>
        </Card>

        <Card className="group relative space-y-2 transition-all duration-200 hover:border-accent/40 hover:shadow-xs animate-fade-in-up animation-delay-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Nilai Tryout Terakhir</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-soft text-muted group-hover:bg-accent/10 group-hover:text-accent transition-colors">
              <TargetIcon />
            </div>
          </div>
          <p className="text-3xl font-bold text-accent tabular-nums tracking-tight">
            {stats.latestTryoutScore !== null
              ? `${formatScorePercent(stats.latestTryoutScore)}%`
              : "—"}
          </p>
          <span className="text-xs text-muted">
            Batas lulus latihan {PASSING_SCORE_PERCENT}%
          </span>
        </Card>

        <Card className="group relative space-y-2 transition-all duration-200 hover:border-emerald-300 hover:shadow-xs animate-fade-in-up animation-delay-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Nilai Tryout Tertinggi</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition-colors">
              <AwardIcon />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <p className="text-3xl font-bold text-emerald-800 tabular-nums tracking-tight">
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

      {/* Kartu Grafik Progres Penguasaan 9 Topik MTCNA */}
      <Card className="space-y-4 animate-fade-in-up animation-delay-250 transition-all duration-200 hover:shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <ChartBarIcon />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Grafik Progres Penguasaan per Topik
            </h2>
            <p className="text-xs text-muted">
              Akumulasi jawaban benar dari seluruh sesi belajar yang telah selesai.
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
                className="group rounded-xl border border-border bg-surface-soft/40 p-3.5 space-y-2.5 transition-all duration-200 hover:border-accent/40 hover:bg-surface-soft hover:shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs">
                  <Link
                    href={`/belajar/${topicKey}`}
                    className="font-semibold text-foreground group-hover:text-accent transition-colors flex items-center gap-1"
                  >
                    <span>{label}</span>
                    <span className="inline-block opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 text-accent">
                      →
                    </span>
                  </Link>
                  <span className="tabular-nums text-muted font-medium">
                    {mastery.total > 0
                      ? `${mastery.correct}/${mastery.total} (${formatScorePercent(mastery.percent)}%)`
                      : "Belum dikerjakan"}
                  </span>
                </div>
                <ProgressBar
                  current={mastery.correct}
                  total={mastery.total > 0 ? mastery.total : 1}
                  variant="dynamic"
                  size="sm"
                  label={`Penguasaan ${label}`}
                />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Kartu Riwayat Sesi Terakhir */}
      <Card className="space-y-4 animate-fade-in-up animation-delay-300 transition-all duration-200 hover:shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-soft text-muted">
            <HistoryIcon />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Riwayat Sesi Terakhir
          </h2>
        </div>

        {stats.recentAttempts.length === 0 ? (
          <p className="text-sm text-muted py-4">
            Belum ada riwayat latihan. Pilih{" "}
            <Link href="/belajar" className="font-semibold text-accent hover:underline">
              Belajar per Topik
            </Link>{" "}
            atau{" "}
            <Link href="/tryout" className="font-semibold text-accent hover:underline">
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
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-surface-soft/60"
                    >
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
                          <Badge variant="caution" className="inline-flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Sedang Berjalan</span>
                          </Badge>
                        ) : item.scorePercent !== null ? (
                          <span className="font-semibold text-foreground">
                            {formatScorePercent(item.scorePercent)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <ActionMenu
                          ariaLabel={`Aksi untuk sesi ${formatAttemptLabel(item)}`}
                          items={[
                            {
                              key: "open-attempt",
                              label: isOngoing ? "Lanjutkan Pengerjaan" : "Lihat Hasil Evaluasi",
                              href: targetHref,
                              variant: isOngoing ? "accent" : "default",
                              icon: isOngoing ? <PlayIcon /> : <FileTextIcon />,
                            },
                          ]}
                        />
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
        <div className="space-y-6 animate-pulse">
          <div className="h-20 rounded-2xl bg-surface-soft" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-28 rounded-2xl bg-surface-soft" />
            <div className="h-28 rounded-2xl bg-surface-soft" />
            <div className="h-28 rounded-2xl bg-surface-soft" />
          </div>
          <div className="h-64 rounded-2xl bg-surface-soft" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
