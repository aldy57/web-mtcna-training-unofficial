"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * NavigationScrollRestorer:
 * 1. Memastikan scroll window selalu di-reset ke posisi paling atas (top: 0) saat berpindah rute/halaman.
 * 2. Menyinkronkan dan memuat ulang (refresh) data server secara otomatis pada setiap perpindahan
 *    halaman di dashboard (baik role peserta maupun admin) agar data selalu segar tanpa perlu hard refresh.
 */
export function NavigationScrollRestorer() {
  const pathname = usePathname();
  const router = useRouter();
  const isInitialMountRef = useRef(true);

  // Reset scroll position ke atas pada setiap navigasi
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

    const frameId = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [pathname]);

  // Muat ulang data server terbaru (router.refresh) pada setiap perpindahan halaman
  useEffect(() => {
    // Lewati initial mount karena halaman baru saja selesai dimuat dari server
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    // Panggil router.refresh() untuk mengambil data server terbaru pada setiap perpindahan rute
    router.refresh();
  }, [pathname, router]);

  return null;
}
