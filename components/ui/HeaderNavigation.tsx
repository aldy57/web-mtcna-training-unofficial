"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Badge } from "@/components/ui/Badge";
import { UI_STRINGS } from "@/lib/ui-strings";
import type { UserProfile } from "@/lib/types";

export interface HeaderNavigationProps {
  user: UserProfile | null;
}

interface NavLinkItem {
  href: string;
  label: string;
  badge?: string;
  icon: (props: { className?: string }) => React.JSX.Element;
  isActive: (pathname: string) => boolean;
}

function DashboardIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function BookIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 6h10" />
      <path d="M6 10h10" />
    </svg>
  );
}

function TryoutIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function GuideIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
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

export function HeaderNavigation({ user }: HeaderNavigationProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Menutup menu mobile saat URL berubah tanpa cascading render effect
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileMenuOpen(false);
  }

  // Menutup menu mobile jika tombol Escape ditekan
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Kunci scroll body saat menu mobile terbuka
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const navLinks: NavLinkItem[] = [];

  // Halaman panduan dan fitur lainnya hanya terlihat ketika pengguna sudah login
  if (user?.role === "user") {
    navLinks.push(
      {
        href: "/dashboard",
        label: UI_STRINGS.nav.dashboard,
        icon: DashboardIcon,
        isActive: (path) => path === "/dashboard",
      },
      {
        href: "/belajar",
        label: UI_STRINGS.nav.study,
        icon: BookIcon,
        isActive: (path) => path.startsWith("/belajar"),
      },
      {
        href: "/tryout",
        label: UI_STRINGS.nav.tryout,
        icon: TryoutIcon,
        isActive: (path) => path.startsWith("/tryout"),
      },
      {
        href: "/panduan",
        label: UI_STRINGS.nav.guide,
        icon: GuideIcon,
        isActive: (path) => path === "/panduan",
      },
    );
  } else if (user?.role === "admin") {
    navLinks.push(
      {
        href: "/admin",
        label: "Beranda",
        icon: DashboardIcon,
        isActive: (path) => path.startsWith("/admin"),
      },
      {
        href: "/panduan",
        label: UI_STRINGS.nav.guide,
        icon: GuideIcon,
        isActive: (path) => path === "/panduan",
      },
    );
  }

  const isAccountActive = pathname === "/akun";

  return (
    <>
      {/* ==================================================================== */}
      {/* 1. TAMPILAN DESKTOP (md:flex)                                        */}
      {/* ==================================================================== */}
      <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
        {navLinks.map((link) => {
          const active = link.isActive(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                active
                  ? "bg-surface-selected text-accent font-semibold border border-accent/20 shadow-2xs"
                  : "text-muted font-medium hover:text-foreground hover:bg-neutral-100/90"
              }`}
            >
              <span>{link.label}</span>
              {link.badge && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider ${
                    active ? "bg-accent/15 text-accent" : "bg-neutral-200 text-muted"
                  }`}
                >
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}

        {user ? (
          <div className="flex items-center gap-2 pl-1">
            {/* Tombol Icon Profil Akun (People Icon) */}
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

            {/* Tombol Logout Desktop */}
            <LogoutButton variant="header" />
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-1">
            <Link
              href="/login"
              className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-foreground hover:border-neutral-300 hover:bg-neutral-100 transition-all duration-150 cursor-pointer"
            >
              {UI_STRINGS.nav.login}
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover hover:shadow-2xs transition-all duration-150 cursor-pointer"
            >
              {UI_STRINGS.nav.register}
            </Link>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 2. TOMBOL AKSI MOBILE (md:hidden)                                    */}
      {/* ==================================================================== */}
      <div className="md:hidden flex items-center gap-2">
        {user && (
          <Link
            href="/akun"
            title={`Pengaturan Akun: ${user.fullName || user.email}`}
            aria-label="Pengaturan Akun"
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-150 cursor-pointer ${
              isAccountActive
                ? "border-accent/30 bg-surface-selected text-accent shadow-2xs"
                : "border-border bg-surface text-muted hover:border-neutral-300 hover:bg-neutral-100 hover:text-foreground"
            }`}
          >
            <UserIcon className="h-4.5 w-4.5" />
          </Link>
        )}

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation-drawer"
          aria-label="Buka navigasi menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:border-neutral-300 hover:bg-neutral-100 hover:text-foreground transition-all duration-150 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 3. SLIDE-OVER DRAWER MENU MOBILE (PORTAL ROOT)                      */}
      {/* ==================================================================== */}
      {isMobileMenuOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id="mobile-navigation-drawer"
            className="fixed inset-0 z-100 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi utama"
          >
            {/* Latar Belakang Redup (Backdrop) */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Kontainer Drawer Geser Kanan */}
            <div
              className="relative z-10 flex h-full w-full max-w-xs flex-col bg-surface p-5 shadow-2xl border-l border-border overflow-y-auto animate-in slide-in-from-right duration-200"
              onClick={(event) => event.stopPropagation()}
            >
              {/* Header Drawer */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex flex-col">
                  <span className="text-base font-bold tracking-wider text-foreground">
                    {UI_STRINGS.brand}
                  </span>
                  <span className="text-xs text-muted">{UI_STRINGS.edition}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Tutup navigasi menu"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:border-neutral-300 hover:bg-neutral-100 hover:text-foreground transition-colors cursor-pointer"
                >
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
                </button>
              </div>

              {/* Bagian Profil Pengguna (Jika sudah masuk) */}
              {user ? (
                <Link
                  href="/akun"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface-soft p-3 hover:border-neutral-300 hover:bg-neutral-100/70 transition-colors cursor-pointer group"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white font-bold text-sm">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-accent">
                        {user.fullName || user.email}
                      </p>
                      <Badge variant={user.role === "admin" ? "accent" : "neutral"}>
                        {user.role === "admin" ? "Admin" : "Peserta"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted truncate">{user.email}</p>
                  </div>
                </Link>
              ) : (
                <div className="mt-4 rounded-xl border border-border bg-surface-soft p-3.5 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                    MTCNA Training
                  </p>
                  <p className="text-xs text-muted">
                    Masuk atau daftar akun untuk menyimpan riwayat latihan & tryout Anda.
                  </p>
                </div>
              )}

              {/* Daftar Menu Navigasi */}
              {navLinks.length > 0 && (
                <nav className="mt-4 flex-1 space-y-1" aria-label="Navigasi menu">
                  <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                    Menu Navigasi
                  </p>
                  {navLinks.map((link) => {
                    const active = link.isActive(pathname);
                    const IconComponent = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                          active
                            ? "bg-surface-selected text-accent font-semibold border border-accent/20"
                            : "text-muted hover:bg-neutral-100 hover:text-foreground active:bg-neutral-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent
                            className={`h-4 w-4 ${active ? "text-accent" : "text-muted"}`}
                          />
                          <span>{link.label}</span>
                        </div>
                        {link.badge && (
                          <Badge variant={active ? "neutral" : "accent"}>
                            {link.badge}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}

                  {user && (
                    <Link
                      href="/akun"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                        isAccountActive
                          ? "bg-surface-selected text-accent font-semibold border border-accent/20"
                          : "text-muted hover:bg-neutral-100 hover:text-foreground active:bg-neutral-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <UserIcon
                          className={`h-4 w-4 ${isAccountActive ? "text-accent" : "text-muted"}`}
                        />
                        <span>Pengaturan Akun</span>
                      </div>
                      <span className="text-xs opacity-60">→</span>
                    </Link>
                  )}
                </nav>
              )}

              {/* Bagian Bawah Drawer (Logout / Auth) */}
              <div className="pt-4 mt-auto border-t border-border">
                {user ? (
                  <LogoutButton
                    variant="mobile"
                    onLogoutStart={() => setIsMobileMenuOpen(false)}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground hover:border-neutral-300 hover:bg-neutral-100 transition-colors"
                    >
                      {UI_STRINGS.nav.login}
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
                    >
                      {UI_STRINGS.nav.register}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
