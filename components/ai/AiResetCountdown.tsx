"use client";

import { useEffect, useState } from "react";

export interface AiResetCountdownProps {
  resetAt: string | null;
  onExpired?: () => void;
  className?: string;
}

function calculateDiffMs(resetAtIso: string | null): number {
  if (!resetAtIso) {
    return 0;
  }
  const resetMs = Date.parse(resetAtIso);
  if (Number.isNaN(resetMs)) {
    return 0;
  }
  return Math.max(0, resetMs - Date.now());
}

function formatRemainingDuration(diffMs: number): string {
  if (diffMs <= 0) {
    return "Siap direset";
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}j ${minutes.toString().padStart(2, "0")}m ${seconds
      .toString()
      .padStart(2, "0")}d`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, "0")}d`;
  }

  return `${seconds}d`;
}

export function AiResetCountdown({
  resetAt,
  onExpired,
  className = "",
}: AiResetCountdownProps) {
  const [prevResetAt, setPrevResetAt] = useState(resetAt);
  const [diffMs, setDiffMs] = useState<number>(() => calculateDiffMs(resetAt));

  if (prevResetAt !== resetAt) {
    setPrevResetAt(resetAt);
    setDiffMs(calculateDiffMs(resetAt));
  }

  useEffect(() => {
    if (!resetAt) {
      return;
    }

    const intervalHandle = setInterval(() => {
      const remaining = calculateDiffMs(resetAt);
      setDiffMs(remaining);

      if (remaining <= 0) {
        clearInterval(intervalHandle);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(intervalHandle);
  }, [resetAt, onExpired]);

  if (!resetAt) {
    return <span className={className}>1 hari</span>;
  }

  return (
    <span className={`tabular-nums font-mono ${className}`}>
      {formatRemainingDuration(diffMs)}
    </span>
  );
}
