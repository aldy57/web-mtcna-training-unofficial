import type { ReactNode } from "react";

type BadgeVariant = "neutral" | "success" | "caution" | "accent";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-surface-soft text-muted border-border",
  success: "bg-success-bg text-success-ink border-emerald-200",
  caution: "bg-caution-bg text-caution-ink border-caution-border",
  accent: "bg-surface-selected text-accent border-accent/20",
};

export function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${VARIANT_CLASSES[variant]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

