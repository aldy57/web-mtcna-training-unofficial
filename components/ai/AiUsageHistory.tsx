import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { AI_FEATURE_LABELS } from "@/lib/constants";
import { formatScorePercent } from "@/lib/scoring";
import type { AiUsageLogEntry } from "@/lib/types";

export interface AiUsageHistoryProps {
  logs: readonly AiUsageLogEntry[];
}

function formatLogDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AiUsageHistory({ logs }: AiUsageHistoryProps) {
  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">
          Riwayat Pemakaian Kuota AI
        </h2>
        <p className="text-xs text-muted">
          Catatan penggunaan fitur AI berkuota pada akun Anda (20 aktivitas
          terakhir).
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-soft p-5 text-center text-xs text-muted">
          Belum ada riwayat pemakaian kuota AI.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="py-2.5 pr-4 font-semibold">Waktu</th>
                <th className="py-2.5 px-4 font-semibold">Fitur</th>
                <th className="py-2.5 px-4 font-semibold">Konteks</th>
                <th className="py-2.5 pl-4 text-right font-semibold">
                  Kuota Terpakai
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((entry) => (
                <tr key={entry.id}>
                  <td className="py-3 pr-4 text-xs text-muted whitespace-nowrap">
                    {formatLogDate(entry.createdAt)}
                  </td>
                  <td className="py-3 px-4 font-medium text-foreground">
                    {AI_FEATURE_LABELS[entry.feature] ?? entry.feature}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted">
                    {entry.questionId
                      ? `Soal ${entry.questionId}`
                      : "Evaluasi Tryout"}
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <Badge variant="neutral">
                      -{formatScorePercent(entry.percentUsed)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

