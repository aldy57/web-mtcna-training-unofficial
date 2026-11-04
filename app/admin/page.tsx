import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccountManagementPanel } from "@/components/admin/AccountManagementPanel";
import { QuestionManagementPanel } from "@/components/admin/QuestionManagementPanel";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getAdminDashboardData } from "@/lib/admin-repo";
import { requireRole } from "@/lib/auth";
import { LANGUAGE_NAMES } from "@/lib/constants";
import { formatScorePercent } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Panel Administrator",
};

async function AdminDashboardContent() {
  await requireRole("admin");
  const data = await getAdminDashboardData();

  return (
    <div className="w-full space-y-8">
      <section className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Panel Administrator
        </p>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Manajemen Akun, Bank Soal &amp; Statistik Tryout
        </h1>
        <p className="text-sm text-muted">
          Kelola akun peserta dan admin, sunting soal dwibahasa beserta kunci
          jawaban, serta pantau hasil latihan seluruh peserta.
        </p>
      </section>

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

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          1. Kelola Akun Peserta &amp; Admin
        </h2>
        <AccountManagementPanel users={data.users} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          2. Hasil &amp; Aktivitas Latihan Peserta Terbaru
        </h2>
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
                  {data.recentAttempts.slice(0, 15).map((item) => (
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

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          3. Kelola Bank Soal &amp; Kunci Jawaban
        </h2>
        <QuestionManagementPanel questions={data.questions} />
      </section>

      {data.auditLogs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            4. Log Audit Aktivitas Admin
          </h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="py-2 pr-3 font-semibold">Aksi</th>
                    <th className="py-2 px-3 font-semibold">Target ID</th>
                    <th className="py-2 pl-3 font-semibold">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 pr-3 font-mono font-semibold text-foreground">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted">
                        {log.targetId}
                      </td>
                      <td className="py-2.5 pl-3 text-muted">
                        {log.createdAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}
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
      <AdminDashboardContent />
    </Suspense>
  );
}

