"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/PopupModal";
import { logoutAction } from "@/lib/actions/auth-actions";
import { UI_STRINGS } from "@/lib/ui-strings";

export interface LogoutButtonProps {
  className?: string;
  variant?: "header" | "mobile";
  onLogoutStart?: () => void;
}

export function LogoutButton({
  className = "",
  variant = "header",
  onLogoutStart,
}: LogoutButtonProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirmLogout() {
    onLogoutStart?.();
    startTransition(async () => {
      await logoutAction();
    });
  }

  const defaultClasses =
    variant === "mobile"
      ? "w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-danger-bg px-4 py-2.5 text-sm font-semibold text-danger-ink hover:bg-red-100 hover:border-red-300 transition-colors cursor-pointer"
      : "rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-muted hover:border-red-300 hover:bg-danger-bg hover:text-danger-ink hover:shadow-2xs transition-all duration-150 flex items-center gap-1.5 cursor-pointer";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirmOpen(true)}
        className={`${defaultClasses} ${className}`.trim()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>{UI_STRINGS.nav.logout}</span>
      </button>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Konfirmasi Keluar Akun"
        description="Apakah Anda yakin ingin keluar dari sesi akun Anda saat ini?"
        confirmLabel="Ya, Keluar"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isPending}
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
}


