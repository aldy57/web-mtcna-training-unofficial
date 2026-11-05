"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Memastikan scroll window selalu di-reset ke posisi paling atas (top: 0)
 * setiap kali pengguna berpindah rute/halaman di dalam aplikasi.
 */
export function NavigationScrollRestorer() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Jika navigasi menggunakan anchor hash (misal: #faq), biarkan browser menangani loncatan anchor
    if (window.location.hash) {
      return;
    }

    // Reset posisi scroll window ke paling atas secara instan
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }

    // Penjagaan ganda melalui requestAnimationFrame apabila halaman sedang streaming/suspense
    const frameId = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [pathname]);

  return null;
}

