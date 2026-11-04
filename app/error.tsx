"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="w-full py-6">
      <Card className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-danger-ink">
          Terjadi Kendala
        </p>
        <h1 className="text-xl font-semibold text-foreground">
          Halaman tidak dapat dimuat saat ini
        </h1>
        <p className="text-sm text-muted">
          {error.message || "Terjadi kesalahan tak terduga pada sistem."}
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="primary" onClick={() => reset()}>
            Coba Lagi
          </Button>
        </div>
      </Card>
    </div>
  );
}

