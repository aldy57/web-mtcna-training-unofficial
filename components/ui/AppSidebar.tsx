"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Badge } from "@/components/ui/Badge";
import { useSidebar } from "@/components/ui/SidebarContext";
import type { UserProfile } from "@/lib/types";
import { UI_STRINGS } from "@/lib/ui-strings";

export interface AppSidebarProps {
  user: UserProfile;
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

function UsersIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SparklesIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const { isMobileOpen, closeMobile } = useSidebar();

  const navLinks: NavLinkItem[] = [];

  if (user.role === "user") {
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
        href: "/chat-ai",
        label: UI_STRINGS.nav.chatAi,
        badge: "NEW",
        icon: SparklesIcon,
        isActive: (path) => path.startsWith("/chat-ai"),
      },
      {
        href: "/panduan",
        label: UI_STRINGS.nav.guide,
        icon: GuideIcon,
        isActive: (path) => path === "/panduan",
      },
    );
  } else if (user.role === "admin") {
    navLinks.push(
      {
        href: "/admin",
        label: "Ringkasan",
        icon: DashboardIcon,
        isActive: (path) => path === "/admin",
      },
      {
        href: "/admin/pengguna",
        label: "Kelola Pengguna",
        icon: UsersIcon,
        isActive: (path) => path.startsWith("/admin/pengguna"),
      },
      {
        href: "/admin/soal",
        label: "Bank Soal",
        icon: BookIcon,
        isActive: (path) => path.startsWith("/admin/soal"),
      },
      {
        href: "/admin/ai",
        label: "Layanan & Kuota AI",
        icon: SparklesIcon,
        isActive: (path) => path.startsWith("/admin/ai"),
      },
      {
        href: "/chat-ai",
        label: "MIRA AI",
        badge: "NEW",
        icon: SparklesIcon,
        isActive: (path) => path.startsWith("/chat-ai"),
      },
      {
        href: "/admin/aktivitas",
        label: "Aktivitas Tryout",
        icon: TryoutIcon,
        isActive: (path) => path.startsWith("/admin/aktivitas"),
      },
      {
        href: "/admin/audit",
        label: "Log Audit",
        icon: ShieldCheckIcon,
        isActive: (path) => path.startsWith("/admin/audit"),
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
      {/* 1. SIDEBAR DESKTOP (md:flex)                                         */}
      {/* ==================================================================== */}
      <aside
        className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-surface sticky top-16 h-[calc(100vh-4rem)] p-4 space-y-6 overflow-y-auto"
        aria-label="Navigasi sidebar utama"
      >
        <div className="space-y-1">
          <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted">
            Menu Utama
          </p>
          <nav className="space-y-1" aria-label="Menu navigasi">
            {navLinks.map((link) => {
              const active = link.isActive(pathname);
              const IconComponent = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                    active
                      ? "bg-surface-selected text-accent font-semibold border border-accent/20 shadow-2xs"
                      : "text-muted hover:text-foreground hover:bg-neutral-100/90 active:bg-neutral-100"
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
          </nav>
        </div>

        {/* Kartu Profil Pengguna di Bawah Sidebar Desktop */}
        <div className="mt-auto pt-4 border-t border-border">
          <Link
            href="/akun"
            className={`flex items-center gap-3 rounded-xl border p-3 transition-colors cursor-pointer group ${
              isAccountActive
                ? "border-accent/30 bg-surface-selected"
                : "border-border bg-surface-soft hover:border-neutral-300 hover:bg-neutral-100/70"
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white font-bold text-xs">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate group-hover:text-accent">
                {user.fullName || "Pengguna"}
              </p>
              <p className="text-[11px] text-muted truncate">{user.email}</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* ==================================================================== */}
      {/* 2. DRAWER SIDEBAR MOBILE (PORTAL ROOT, md:hidden)                   */}
      {/* ==================================================================== */}
      {isMobileOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id="mobile-sidebar-drawer"
            className="fixed inset-0 z-100 flex md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi sidebar"
          >
            {/* Backdrop Redup */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={closeMobile}
              aria-hidden="true"
            />

            {/* Panel Drawer Geser Kiri */}
            <div
              className="relative z-10 flex h-full w-full max-w-xs flex-col bg-surface p-5 shadow-2xl border-r border-border overflow-y-auto animate-in slide-in-from-left duration-200"
              onClick={(event) => event.stopPropagation()}
            >
              {/* Header Drawer */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <Link
                  href="/"
                  onClick={closeMobile}
                  className="flex items-center shrink-0 transition-opacity hover:opacity-85"
                  aria-label="MIRA - Beranda"
                >
                  <Image
                    src="/mira-logo.svg"
                    alt="MIRA - MikroTik Intelligence Review & Assessment"
                    width={106}
                    height={38}
                    className="h-8 w-auto object-contain"
                  />
                </Link>
                <button
                  type="button"
                  onClick={closeMobile}
                  aria-label="Tutup menu navigasi"
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

              {/* Status Akun Pengguna Mobile */}
              <Link
                href="/akun"
                onClick={closeMobile}
                className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface-soft p-3 hover:border-neutral-300 hover:bg-neutral-100/70 transition-colors cursor-pointer group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white font-bold text-sm">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-accent">
                    {user.fullName || user.email}
                  </p>
                  <p className="text-xs text-muted truncate">{user.email}</p>
                </div>
              </Link>

              {/* Daftar Menu Navigasi Mobile */}
              <nav
                className="mt-5 flex-1 space-y-1"
                aria-label="Navigasi menu mobile"
              >
                <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                  Menu Utama
                </p>
                {navLinks.map((link) => {
                  const active = link.isActive(pathname);
                  const IconComponent = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMobile}
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

                <Link
                  href="/akun"
                  onClick={closeMobile}
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
              </nav>

              {/* Bagian Bawah Drawer: Logout */}
              <div className="pt-4 mt-auto border-t border-border">
                <LogoutButton variant="mobile" onLogoutStart={closeMobile} />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

