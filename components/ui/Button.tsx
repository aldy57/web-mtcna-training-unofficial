import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white border-accent hover:bg-accent-hover shadow-xs",
  secondary:
    "bg-surface text-foreground border-border hover:bg-surface-soft hover:border-neutral-400",
  danger:
    "bg-danger-bg text-danger-ink border-red-200 hover:bg-red-100",
  ghost:
    "bg-transparent text-muted border-transparent hover:bg-surface-soft hover:text-foreground",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3.5 py-1.5 text-xs rounded-full",
  md: "px-5 py-2.5 text-sm rounded-full",
  lg: "px-6 py-3 text-sm rounded-full",
};

export function Button({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const widthClass = fullWidth ? "w-full justify-center" : "";
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 border font-medium transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${widthClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}

