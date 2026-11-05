"use client";

import { usePathname } from "next/navigation";
import { UI_STRINGS } from "@/lib/ui-strings";

export function AppFooter() {
  const pathname = usePathname();

  // Pada halaman chat-ai, footer disembunyikan agar layout obrolan penuh dan bersih
  if (pathname.startsWith("/chat-ai")) {
    return null;
  }

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 text-xs text-muted leading-relaxed">
        {UI_STRINGS.footerText}
      </div>
    </footer>
  );
}

