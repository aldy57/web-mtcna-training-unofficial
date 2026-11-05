import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getAdminDashboardData } from "@/lib/admin-repo";
import { requireRole } from "@/lib/auth";
import { LANGUAGE_NAMES } from "@/lib/constants";
import { formatScorePercent } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Ringkasan Panel Admin",
};

async function AdminOverviewContent() {
  await requireRole("admin");
  const data = await getAdminDashboardData();

  return (
    <div className="w-full space-y-8">
      {/* Header Halaman */}
      <section className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Panel Administrator
        </p>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Ringkasan &amp; Pusat Kendali
        </h1>
        <p className="text-sm text-muted">
          Pantau statistik utama platform latihan MTCNA dan navigasi langsung ke
          setiap modul pengelolaan.
        </p>
      </section>

      {/* 4 Kartu Metrik Utama */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="space-y-1">
          <span className="text-xs text-muted">Total Peserta</span>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {data.metrics.totalParticipants}
          </p>
        </Card>
        <Card className="space-y-1">
          <span className="text-xs text-muted">Total Admin</span>
          <p className="text-2xl font-bold text-accent tabular-nums">
            {data.metrics.totalAdmins}
          </p>
        </Card>
        <Card className="space-y-1">
          <span className="text-xs text-muted">Bank Soal Aktif</span>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {data.metrics.totalQuestions}
          </p>
        </Card>
        <Card className="space-y-1">
          <span className="text-xs text-muted">Rata-rata Nilai Tryout</span>
          <p className="text-2xl font-bold text-emerald-800 tabular-nums">
            {data.metrics.averageTryoutScore !== null
              ? `${formatScorePercent(data.metrics.averageTryoutScore)}%`
              : "—"}
          </p>
        </Card>
      </section>

      {/* 5 Modul Pengelolaan Utama (Quick Access Cards) */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Modul Pengelolaan
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* 1. Pengguna */}
          <Link
            href="/admin/pengguna"
            className="group block rounded-2xl border border-border bg-surface p-5 hover:border-accent/40 hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                Modul 1
              </span>
              <Badge variant="neutral">
                {data.metrics.totalParticipants} Peserta
              </Badge>
            </div>
            <h3 className="mt-2 text-base font-semibold text-foreground group-hover:text-accent transition-colors">
              Kelola Pengguna
            </h3>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Buat akun peserta/admin baru, reset kata sandi, dan hapus akun
              dengan proteksi role server.
            </p>
            <span className="mt-3.5 inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:underline">
              Buka Halaman Pengguna →
            </span>
          </Link>

          {/* 2. Bank Soal */}
          <Link
            href="/admin/soal"
            className="group block rounded-2xl border border-border bg-surface p-5 hover:border-accent/40 hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                Modul 2
              </span>
              <Badge variant="neutral">
                {data.metrics.totalQuestions} Soal
              </Badge>
            </div>
            <h3 className="mt-2 text-base font-semibold text-foreground group-hover:text-accent transition-colors">
              Bank Soal &amp; Kunci
            </h3>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Sunting 50 soal kurasi dwibahasa (ID/EN), kunci jawaban
              tunggal/jamak, dan pembahasan.
            </p>
            <span className="mt-3.5 inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:underline">
              Buka Halaman Bank Soal →
            </span>
          </Link>

          {/* 3. Layanan AI */}
          <Link
            href="/admin/ai"
            className="group block rounded-2xl border border-border bg-surface p-5 hover:border-accent/40 hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                Modul 3
              </span>
              <Badge
                variant={
                  !data.aiGlobalStatus.isEnabled
                    ? "neutral"
                    : data.aiGlobalStatus.isExhausted ||
                        data.aiGlobalStatus.isLowWarning
                      ? "caution"
                      : "success"
                }
              >
                {!data.aiGlobalStatus.isEnabled
                  ? "Nonaktif"
                  : data.aiGlobalStatus.isExhausted
                    ? "Kuota Habis"
                    : `Sisa ${
                        data.aiGlobalStatus.remainingPercent !== null
                          ? `${formatScorePercent(data.aiGlobalStatus.remainingPercent)}%`
                          : "Aktif"
                      }`}
              </Badge>
            </div>
            <h3 className="mt-2 text-base font-semibold text-foreground group-hover:text-accent transition-colors">
              Layanan &amp; Kuota AI
            </h3>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Pantau kuota API global (GET /v1/quota), sakelar AI, penyesuaian
              kuota peserta, dan pembersih cache.
            </p>
            <span className="mt-3.5 inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:underline">
              Buka Layanan AI →
            </span>
          </Link>

          {/* 4. Aktivitas Tryout */}
          <Link
            href="/admin/aktivitas"
            className="group block rounded-2xl border border-border bg-surface p-5 hover:border-accent/40 hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                Modul 4
              </span>
              <Badge variant="neutral">
                {data.recentAttempts.length} Aktivitas
              </Badge>
            </div>
            <h3 className="mt-2 text-base font-semibold text-foreground group-hover:text-accent transition-colors">
              Aktivitas Tryout
            </h3>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Pantau hasil latihan peserta, status tryout berjalan, dan riwayat
              pengerjaan soal lengkap.
            </p>
            <span className="mt-3.5 inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:underline">
              Buka Aktivitas Tryout →
            </span>
          </Link>

          {/* 5. Log Audit */}
          <Link
            href="/admin/audit"
            className="group block rounded-2xl border border-border bg-surface p-5 hover:border-accent/40 hover:shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                Modul 5
              </span>
              <Badge variant="neutral">Keamanan &amp; Audit</Badge>
            </div>
            <h3 className="mt-2 text-base font-semibold text-foreground group-hover:text-accent transition-colors">
              Log Audit Aktivitas
            </h3>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Rekam jejak seluruh aksi admin, pembuatan akun, perubahan kunci,
              dan penyesuaian kuota.
            </p>
            <span className="mt-3.5 inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:underline">
              Buka Log Audit →
            </span>
          </Link>
        </div>
      </section>

      {/* Ringkasan Singkat Aktivitas Terbaru */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Aktivitas Peserta Terbaru
          </h2>
          <Link
            href="/admin/aktivitas"
            className="text-xs font-semibold text-accent hover:underline"
          >
            Lihat Semua Aktivitas →
          </Link>
        </div>
        <Card>
          {data.recentAttempts.length === 0 ? (
            <p className="text-sm text-muted py-3">
              Belum ada aktivitas tryout atau latihan dari peserta.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="py-2.5 pr-4 font-semibold">Peserta</th>
                    <th className="py-2.5 px-3 font-semibold">Mode</th>
                    <th className="py-2.5 px-3 font-semibold">Bahasa</th>
                    <th className="py-2.5 px-3 font-semibold">Skor</th>
                    <th className="py-2.5 pl-3 font-semibold text-right">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.recentAttempts.slice(0, 5).map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 pr-4">
                        <span className="font-medium text-foreground block">
                          {item.userName}
                        </span>
                        <span className="text-xs text-muted">
                          {item.userEmail}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs uppercase font-semibold text-muted">
                        {item.mode} {item.topic ? `(${item.topic})` : ""}
                      </td>
                      <td className="py-3 px-3 text-xs text-muted">
                        {LANGUAGE_NAMES[item.language]}
                      </td>
                      <td className="py-3 px-3 tabular-nums">
                        {item.status === "in_progress" ? (
                          <Badge variant="caution">Berjalan</Badge>
                        ) : item.scorePercent !== null ? (
                          <span className="font-semibold">
                            {formatScorePercent(item.scorePercent)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        {item.status !== "in_progress" && (
                          <Link
                            href={`/tryout/${item.id}/hasil`}
                            className="text-xs font-semibold text-accent hover:underline"
                          >
                            Lihat Hasil →
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-24 animate-pulse rounded-2xl bg-surface-soft" />
          <div className="h-96 animate-pulse rounded-2xl bg-surface-soft" />
        </div>
      }
    >
      <AdminOverviewContent />
    </Suspense>
  );
}
