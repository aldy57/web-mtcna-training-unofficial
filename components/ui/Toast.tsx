"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  dismissToast,
  getToasts,
  subscribeToasts,
  type ToastData,
  type ToastType,
} from "@/lib/toast";

function SuccessIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const TOAST_TYPE_CONFIG: Record<
  ToastType,
  {
    icon: typeof SuccessIcon;
    iconWrapperClass: string;
    cardBorderClass: string;
    progressBarClass: string;
  }
> = {
  success: {
    icon: SuccessIcon,
    iconWrapperClass:
      "bg-emerald-50 text-emerald-600 border border-emerald-200/80",
    cardBorderClass: "border-emerald-200/60 shadow-emerald-500/5",
    progressBarClass: "bg-emerald-500",
  },
  error: {
    icon: ErrorIcon,
    iconWrapperClass: "bg-red-50 text-red-600 border border-red-200/80",
    cardBorderClass: "border-red-200/60 shadow-red-500/5",
    progressBarClass: "bg-red-500",
  },
  info: {
    icon: InfoIcon,
    iconWrapperClass: "bg-sky-50 text-sky-600 border border-sky-200/80",
    cardBorderClass: "border-sky-200/60 shadow-sky-500/5",
    progressBarClass: "bg-accent",
  },
  warning: {
    icon: ErrorIcon,
    iconWrapperClass: "bg-amber-50 text-amber-600 border border-amber-200/80",
    cardBorderClass: "border-amber-200/60 shadow-amber-500/5",
    progressBarClass: "bg-amber-500",
  },
};

function ToastCard({ toast }: { toast: ToastData }) {
  const config = TOAST_TYPE_CONFIG[toast.type] ?? TOAST_TYPE_CONFIG.info;
  const IconComponent = config.icon;
  const duration = toast.duration ?? 5000;

  return (
    <div
      role="status"
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border bg-surface/98 p-4 shadow-lg backdrop-blur-md transition-all duration-300 ${config.cardBorderClass}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.iconWrapperClass}`}
        >
          <IconComponent />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <p className="text-sm font-semibold text-foreground leading-snug">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-xs text-muted leading-relaxed mt-0.5">
              {toast.message}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => dismissToast(toast.id)}
          className="shrink-0 -mr-1 -mt-1 p-1 text-muted hover:text-foreground rounded-lg hover:bg-surface-soft transition-colors cursor-pointer"
          aria-label="Tutup notifikasi"
        >
          <CloseIcon />
        </button>
      </div>

      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-border/25 overflow-hidden">
          <div
            className={`h-full ${config.progressBarClass}`}
            style={{
              animation: `toast-progress ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}

const EMPTY_TOASTS: ToastData[] = [];

function getServerSnapshot(): ToastData[] {
  return EMPTY_TOASTS;
}

export function ToastContainer() {
  const toasts = useSyncExternalStore(
    subscribeToasts,
    getToasts,
    getServerSnapshot,
  );

  // Bersihkan sisa pending toast dari sessionStorage jika ada
  useEffect(() => {
    try {
      sessionStorage.removeItem("mira_pending_toast");
    } catch {
      // Abaikan jika storage diblokir
    }
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label="Pemberitahuan Sistem"
      aria-live="polite"
      className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </aside>
  );
}

