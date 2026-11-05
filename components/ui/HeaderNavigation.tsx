"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { useSidebar } from "@/components/ui/SidebarContext";
import type { UserProfile } from "@/lib/types";
import { UI_STRINGS } from "@/lib/ui-strings";

export interface HeaderNavigationProps {
  user: UserProfile | null;
}

function UserIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function MobileMenuButton() {
  const { isMobileOpen, toggleMobile } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggleMobile}
      aria-label={isMobileOpen ? "Tutup navigasi menu" : "Buka navigasi menu"}
      aria-expanded={isMobileOpen}
      className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:border-neutral-300 hover:bg-neutral-100 hover:text-foreground transition-all duration-150 cursor-pointer"
    >
      {isMobileOpen ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4.5 w-4.5"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4.5 w-4.5"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      )}
    </button>
  );
}

export function HeaderNavigation({ user }: HeaderNavigationProps) {
  const pathname = usePathname();
  const isAccountActive = pathname === "/akun";

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-full border border-border bg-surface px-4 py-1.5 text-xs sm:text-sm font-medium text-foreground hover:border-neutral-300 hover:bg-neutral-100 transition-all duration-150 cursor-pointer"
        >
          {UI_STRINGS.nav.login}
        </Link>
        <Link
          href="/register"
          className="rounded-full bg-accent px-4 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-accent-hover hover:shadow-2xs transition-all duration-150 cursor-pointer"
        >
          {UI_STRINGS.nav.register}
        </Link>
      </div>
    );
  }

  return (
    <div className="hidden md:flex items-center gap-2">
      {/* Tombol Icon Profil Akun (Hanya tampil di Desktop; pada mobile sudah ada di burger menu) */}
      <Link
        href="/akun"
        title={`Pengaturan Akun: ${user.fullName || user.email}`}
        aria-label="Pengaturan Akun"
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-150 cursor-pointer ${
          isAccountActive
            ? "border-accent/30 bg-surface-selected text-accent shadow-2xs"
            : "border-border bg-surface text-muted hover:border-neutral-300 hover:bg-neutral-100 hover:text-foreground"
        }`}
      >
        <UserIcon className="h-4 w-4" />
      </Link>

      {/* Tombol Logout (Hanya tampil di Desktop; pada mobile sudah ada di burger menu) */}
      <LogoutButton variant="header" />
    </div>
  );
}
