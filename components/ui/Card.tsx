import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-6 shadow-2xs ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}

