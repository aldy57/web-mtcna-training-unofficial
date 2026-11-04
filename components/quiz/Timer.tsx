"use client";

import { useEffect, useRef, useState } from "react";

export interface TimerProps {
  deadlineAtIso: string;
  isFinished: boolean;
  onExpire: () => void;
}

function computeRemainingSeconds(deadlineAtIso: string): number {
  const deadlineMs = new Date(deadlineAtIso).getTime();
  return Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
}

function formatClock(totalSeconds: number): string {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function Timer({ deadlineAtIso, isFinished, onExpire }: TimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    computeRemainingSeconds(deadlineAtIso),
  );
  const hasTriggeredExpire = useRef(false);

  useEffect(() => {
    if (isFinished) {
      return;
    }

    function tick() {
      const left = computeRemainingSeconds(deadlineAtIso);
      setRemainingSeconds(left);
      if (left <= 0 && !hasTriggeredExpire.current) {
        hasTriggeredExpire.current = true;
        onExpire();
      }
    }

    tick();
    const intervalId = window.setInterval(tick, 500);
    document.addEventListener("visibilitychange", tick);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [deadlineAtIso, isFinished, onExpire]);

  const isLowTime = remainingSeconds <= 300;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold tabular-nums ${
        isLowTime
          ? "border-red-300 bg-danger-bg text-danger-ink"
          : "border-border bg-surface-soft text-foreground"
      }`}
      aria-live="off"
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      <span>Sisa waktu {formatClock(remainingSeconds)}</span>
    </div>
  );
}

