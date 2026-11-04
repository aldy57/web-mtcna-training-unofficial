export interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export function ProgressBar({ current, total, label }: ProgressBarProps) {
  const safeTotal = total > 0 ? total : 1;
  const percentage = Math.min(100, Math.max(0, (current / safeTotal) * 100));

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200"
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progres pengerjaan"}
    >
      <div
        className="h-full bg-accent transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

