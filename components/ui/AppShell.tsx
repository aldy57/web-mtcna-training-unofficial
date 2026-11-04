import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { HeaderNavigation } from "@/components/ui/HeaderNavigation";
import { getOptionalUser } from "@/lib/auth";
import { UI_STRINGS } from "@/lib/ui-strings";

async function UserNavigationItems() {
  const user = await getOptionalUser();
  return <HeaderNavigation user={user} />;
}

function NavigationFallback() {
  return (
    <div className="flex items-center gap-2">
      <div className="md:hidden h-10 w-10 animate-pulse rounded-xl bg-surface-soft" />
      <div className="hidden md:flex items-center gap-2">
        <div className="h-8 w-20 animate-pulse rounded-full bg-surface-soft" />
        <div className="h-8 w-24 animate-pulse rounded-full bg-surface-soft" />
        <div className="h-8 w-24 animate-pulse rounded-full bg-surface-soft" />
      </div>
    </div>
  );
}

export function AppHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 w-full border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5">
        <Link href="/" className="group flex flex-col shrink-0">
          <span className="text-base font-bold tracking-wider text-foreground group-hover:text-accent transition-colors">
            {UI_STRINGS.brand}
          </span>
          <span className="text-xs text-muted">{UI_STRINGS.edition}</span>
        </Link>
        <nav aria-label="Navigasi utama">
          <Suspense fallback={<NavigationFallback />}>
            <UserNavigationItems />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 text-xs text-muted leading-relaxed">
        {UI_STRINGS.footerText}
      </div>
    </footer>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      {/* Spacer pembatas agar konten tidak tertutup fixed header */}
      <div className="h-[65px] sm:h-[70px] shrink-0" aria-hidden="true" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}

