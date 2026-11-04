import type { ReactNode } from "react";
import { UI_STRINGS } from "@/lib/ui-strings";

type NoticeVariant = "neutral" | "caution" | "success" | "danger";

export interface NoticeProps {
  variant?: NoticeVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<NoticeVariant, string> = {
  neutral: "bg-surface-soft border-border text-foreground",
  caution: "bg-caution-bg border-caution-border text-caution-ink",
  success: "bg-success-bg border-emerald-200 text-success-ink",
  danger: "bg-danger-bg border-red-200 text-danger-ink",
};

export function Notice({
  variant = "neutral",
  title,
  children,
  className = "",
}: NoticeProps) {
  return (
    <div
      className={`rounded-xl border px-5 py-4 text-sm leading-relaxed ${VARIANT_CLASSES[variant]} ${className}`.trim()}
    >
      {title && <p className="font-semibold mb-1.5">{title}</p>}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function CertificationDisclaimerNotice() {
  return (
    <Notice variant="caution" title={UI_STRINGS.disclaimerTitle}>
      <p>{UI_STRINGS.disclaimerBody1}</p>
      <p>{UI_STRINGS.disclaimerBody2}</p>
    </Notice>
  );
}

