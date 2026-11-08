import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AppFooter } from "@/components/ui/AppFooter";
import { AppSidebar } from "@/components/ui/AppSidebar";
import {
  HeaderNavigation,
  MobileMenuButton,
} from "@/components/ui/HeaderNavigation";
import { NavigationScrollRestorer } from "@/components/ui/NavigationScrollRestorer";
import { SidebarProvider } from "@/components/ui/SidebarContext";
import { ToastContainer } from "@/components/ui/Toast";
import { getOptionalUser } from "@/lib/auth";
import { getAppBranding } from "@/lib/branding-repo";

async function HeaderLogo() {
  const branding = await getAppBranding();
  return (
    <Link
      href="/"
      className="group flex items-center shrink-0 transition-opacity hover:opacity-85 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
      aria-label={`${branding.appName} - Beranda`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={branding.logoWithTextUrl || branding.logoUrl || "/network-router-logo-text.svg"}
        alt={branding.appName}
        className="h-8.5 w-auto object-contain"
      />
    </Link>
  );
}

async function UserNavigationItems() {
  const user = await getOptionalUser();
  return <HeaderNavigation user={user} />;
}

async function UserMobileToggle() {
  const user = await getOptionalUser();
  if (!user) {
    return null;
  }
  return <MobileMenuButton />;
}

async function UserSidebarWrapper() {
  const user = await getOptionalUser();
  if (!user) {
    return null;
  }
  return <AppSidebar user={user} />;
}

function NavigationFallback() {
  return (
    <div className="hidden md:flex items-center gap-2">
      <div className="h-9 w-9 animate-pulse rounded-full bg-surface-soft" />
      <div className="h-8 w-20 animate-pulse rounded-full bg-surface-soft" />
    </div>
  );
}

export function AppHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 w-full border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
        {/* Sisi Kiri: Tombol Hamburger Mobile (khusus user login) + Logo Murni Ikon */}
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <UserMobileToggle />
          </Suspense>

          <Suspense
            fallback={
              <div className="h-9 w-9 rounded-lg bg-surface-soft animate-pulse" />
            }
          >
            <HeaderLogo />
          </Suspense>
        </div>

        {/* Sisi Kanan: Ikon Profil & Tombol Logout (atau Masuk/Daftar) */}
        <nav aria-label="Aksi akun">
          <Suspense fallback={<NavigationFallback />}>
            <UserNavigationItems />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <ToastContainer />
      <Suspense fallback={null}>
        <NavigationScrollRestorer />
      </Suspense>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <AppHeader />
        {/* Spacer pembatas agar konten tidak tertutup fixed header */}
        <div className="h-16 shrink-0" aria-hidden="true" />

        <div className="flex flex-1 w-full">
          {/* Sidebar Desktop & Drawer Mobile (Hanya untuk pengguna login) */}
          <Suspense fallback={null}>
            <UserSidebarWrapper />
          </Suspense>

          {/* Area Konten Utama dan Footer */}
          <div className="flex flex-1 flex-col min-w-0">
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
              {children}
            </main>
            <Suspense fallback={null}>
              <AppFooter />
            </Suspense>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
