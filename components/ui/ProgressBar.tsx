"use client";

import { useEffect, useState } from "react";

export interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "accent" | "success" | "dynamic";
  animated?: boolean;
}

export function ProgressBar({
  current,
  total,
  label,
  className = "",
  size = "sm",
  variant = "accent",
  animated = true,
}: ProgressBarProps) {
  const safeTotal = total > 0 ? total : 1;
  const targetPercent = Math.min(100, Math.max(0, (current / safeTotal) * 100));

  // Animasi pengisian halus saat komponen dimuat di browser
  const [displayPercent, setDisplayPercent] = useState(animated ? 0 : targetPercent);

  useEffect(() => {
    if (!animated) return;
    const frame = requestAnimationFrame(() => {
      setDisplayPercent(targetPercent);
    });
    return () => cancelAnimationFrame(frame);
  }, [animated, targetPercent]);

  // Ukuran tinggi progress bar
  const heightClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-2.5",
  }[size];

  // Penentuan warna bar indikator
  let barColorClass = "bg-accent";
  if (variant === "success") {
    barColorClass = "bg-emerald-600";
  } else if (variant === "dynamic") {
    if (targetPercent >= 80) {
      barColorClass = "bg-emerald-600";
    } else if (targetPercent >= 60) {
      barColorClass = "bg-accent";
    } else if (targetPercent > 0) {
      barColorClass = "bg-sky-600";
    } else {
      barColorClass = "bg-muted/40";
    }
  }

  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-surface-soft border border-border/60 ${heightClasses} ${className}`.trim()}
      role="progressbar"
      aria-valuenow={Math.round(targetPercent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progres pengerjaan"}
    >
      <div
        className={`h-full rounded-full ${barColorClass} transition-all duration-700 ease-out`}
        style={{ width: `${displayPercent}%` }}
      />
    </div>
  );
}
