"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import {
  resetAppBrandingAction,
  updateAppBrandingAction,
} from "@/lib/actions/branding-actions";
import { DEFAULT_BRANDING } from "@/lib/constants";
import { showToast } from "@/lib/toast";
import type { AppBrandingSettings } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";

export interface AdminBrandingManagerProps {
  initialBranding: AppBrandingSettings;
}

export function AdminBrandingManager({
  initialBranding,
}: AdminBrandingManagerProps) {
  const [appName, setAppName] = useState(initialBranding.appName);
  const [appFullName, setAppFullName] = useState(initialBranding.appFullName);

  // Logo 1: Logo dengan Teks (Navbar & Loading Screen)
  const [logoWithTextUrl, setLogoWithTextUrl] = useState(
    initialBranding.logoWithTextUrl || initialBranding.logoUrl || DEFAULT_BRANDING.logoWithTextUrl,
  );
  const [modeWithText, setModeWithText] = useState<"upload" | "url">("upload");
  const [fileNameWithText, setFileNameWithText] = useState<string>("");

  // Logo 2: Logo Simbol Saja / Logo Only (Favicon & Tab Browser)
  const [logoIconUrl, setLogoIconUrl] = useState(
    initialBranding.logoIconUrl || initialBranding.faviconUrl || DEFAULT_BRANDING.logoIconUrl,
  );
  const [modeIcon, setModeIcon] = useState<"upload" | "url">("upload");
  const [fileNameIcon, setFileNameIcon] = useState<string>("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isChanged =
    appName !== initialBranding.appName ||
    appFullName !== initialBranding.appFullName ||
    logoWithTextUrl !== (initialBranding.logoWithTextUrl || initialBranding.logoUrl) ||
    logoIconUrl !== (initialBranding.logoIconUrl || initialBranding.faviconUrl);

  function handleFileUpload(
    e: ChangeEvent<HTMLInputElement>,
    type: "withText" | "icon",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      setErrorMsg("Ukuran berkas logo melebihi 1.5MB. Silakan pilih berkas yang lebih kecil.");
      return;
    }

    const validTypes = [
      "image/svg+xml",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/x-icon",
    ];
    if (!validTypes.includes(file.type)) {
      setErrorMsg("Format berkas tidak didukung. Gunakan .svg, .png, .jpg, atau .webp.");
      return;
    }

    setErrorMsg(null);
    if (type === "withText") {
      setFileNameWithText(file.name);
    } else {
      setFileNameIcon(file.name);
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        if (type === "withText") {
          setLogoWithTextUrl(reader.result);
        } else {
          setLogoIconUrl(reader.result);
        }
      }
    };
    reader.onerror = () => {
      setErrorMsg("Gagal membaca berkas gambar.");
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    setErrorMsg(null);
    if (!appName.trim()) {
      setErrorMsg("Nama aplikasi tidak boleh kosong.");
      return;
    }
    if (!appFullName.trim()) {
      setErrorMsg("Nama lengkap aplikasi tidak boleh kosong.");
      return;
    }
    if (!logoWithTextUrl.trim()) {
      setErrorMsg("Logo dengan teks harus disertakan.");
      return;
    }
    if (!logoIconUrl.trim()) {
      setErrorMsg("Logo simbol (logo only) harus disertakan.");
      return;
    }

    startTransition(async () => {
      const res = await updateAppBrandingAction({
        appName,
        appFullName,
        logoWithTextUrl,
        logoIconUrl,
        logoUrl: logoWithTextUrl,
        faviconUrl: logoIconUrl,
      });

      if (!res.ok) {
        setErrorMsg(res.error);
        showToast({
          type: "error",
          title: "Gagal Menyimpan",
          message: res.error,
        });
      } else {
        showToast({
          type: "success",
          title: "Branding Disimpan!",
          message: "Nama aplikasi dan kedua logo berhasil diperbarui.",
        });
      }
    });
  }

  function handleReset() {
    setIsResetConfirmOpen(false);
    setErrorMsg(null);

    startTransition(async () => {
      const res = await resetAppBrandingAction();

      if (!res.ok) {
        setErrorMsg(res.error);
        showToast({
          type: "error",
          title: "Gagal Mereset",
          message: res.error,
        });
      } else {
        setAppName(DEFAULT_BRANDING.appName);
        setAppFullName(DEFAULT_BRANDING.appFullName);
        setLogoWithTextUrl(DEFAULT_BRANDING.logoWithTextUrl);
        setLogoIconUrl(DEFAULT_BRANDING.logoIconUrl);
        setFileNameWithText("");
        setFileNameIcon("");
        showToast({
          type: "success",
          title: "Berhasil Direset",
          message: "Nama dan logo telah dikembalikan ke pengaturan default.",
        });
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Kartu Formulir Pengaturan */}
      <Card className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Informasi Branding Web
          </h2>
          <p className="text-sm text-muted">
            Atur nama situs serta unggah logo dengan teks untuk navigasi dan logo simbol saja untuk favicon.
          </p>
        </div>

        {errorMsg && (
          <Notice variant="danger">
            <p>{errorMsg}</p>
          </Notice>
        )}

        <div className="space-y-6">
          {/* 1. Nama Aplikasi Singkat */}
          <div className="space-y-1.5">
            <label
              htmlFor="branding-app-name"
              className="block text-sm font-medium text-foreground"
            >
              Nama Aplikasi
            </label>
            <input
              id="branding-app-name"
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Contoh: Web Belajar Jaringan Dasar dan AI Jaringan"
              maxLength={80}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-hidden"
            />
            <p className="text-xs text-muted">
              Nama utama yang digunakan di judul halaman dan identitas sistem.
            </p>
          </div>

          {/* 2. Nama Lengkap / Tagline */}
          <div className="space-y-1.5">
            <label
              htmlFor="branding-app-fullname"
              className="block text-sm font-medium text-foreground"
            >
              Nama Lengkap / Tagline Aplikasi
            </label>
            <input
              id="branding-app-fullname"
              type="text"
              value={appFullName}
              onChange={(e) => setAppFullName(e.target.value)}
              placeholder="Contoh: Web Belajar Jaringan Dasar dan AI Jaringan"
              maxLength={150}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-hidden"
            />
            <p className="text-xs text-muted">
              Tampil di kartu login, metadata SEO, serta deskripsi platform.
            </p>
          </div>

          {/* 3. LOGO DENGAN TEKS (Navbar & Loading Screen) */}
          <div className="rounded-2xl border border-border bg-surface-soft/40 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span>1. Logo dengan Teks</span>
                  <span className="text-[11px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                    Navbar &amp; Loading Screen
                  </span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Ditampilkan di bilah navigasi atas (navbar) dan layar loading saat pengguna berhasil masuk.
                </p>
              </div>

              <div className="flex gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setModeWithText("upload")}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    modeWithText === "upload"
                      ? "bg-accent text-white"
                      : "bg-surface text-muted hover:text-foreground border border-border"
                  }`}
                >
                  Unggah Berkas
                </button>
                <button
                  type="button"
                  onClick={() => setModeWithText("url")}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    modeWithText === "url"
                      ? "bg-accent text-white"
                      : "bg-surface text-muted hover:text-foreground border border-border"
                  }`}
                >
                  Ketik URL
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Thumbnail Preview */}
              <div className="h-14 w-44 rounded-xl border border-border bg-surface flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoWithTextUrl || DEFAULT_BRANDING.logoWithTextUrl}
                  alt="Pratinjau Logo dengan Teks"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="flex-1 w-full space-y-2">
                {modeWithText === "upload" ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <label
                        htmlFor="branding-logo-text-file"
                        className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-2xs hover:bg-surface-soft transition-colors"
                      >
                        Pilih Berkas Logo...
                      </label>
                      <input
                        id="branding-logo-text-file"
                        type="file"
                        accept=".svg,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => handleFileUpload(e, "withText")}
                        className="sr-only"
                      />
                      <span className="text-xs text-muted truncate max-w-xs">
                        {fileNameWithText || "Belum ada berkas baru"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted">
                      Rekomendasi rasio horizontal (lebar ~200-300px, tinggi 40-50px). Format SVG, PNG, WebP (maks 1.5MB).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={logoWithTextUrl}
                      onChange={(e) => setLogoWithTextUrl(e.target.value)}
                      placeholder="/network-router-logo-text.svg atau https://..."
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-hidden"
                    />
                    <p className="text-[11px] text-muted">
                      Jalur berkas publik atau URL gambar eksternal.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. LOGO SIMBOL SAJA (Favicon & Tab Browser) */}
          <div className="rounded-2xl border border-border bg-surface-soft/40 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span>2. Logo Simbol Saja (Logo Only)</span>
                  <span className="text-[11px] font-medium text-muted bg-surface px-2 py-0.5 rounded-full border border-border">
                    Favicon &amp; Tab Browser
                  </span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Digunakan untuk favicon tab browser, bookmark, dan representasi simbolis berukuran kecil.
                </p>
              </div>

              <div className="flex gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setModeIcon("upload")}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    modeIcon === "upload"
                      ? "bg-accent text-white"
                      : "bg-surface text-muted hover:text-foreground border border-border"
                  }`}
                >
                  Unggah Berkas
                </button>
                <button
                  type="button"
                  onClick={() => setModeIcon("url")}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    modeIcon === "url"
                      ? "bg-accent text-white"
                      : "bg-surface text-muted hover:text-foreground border border-border"
                  }`}
                >
                  Ketik URL
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Thumbnail Preview */}
              <div className="h-14 w-14 rounded-xl border border-border bg-surface flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoIconUrl || DEFAULT_BRANDING.logoIconUrl}
                  alt="Pratinjau Logo Simbol"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="flex-1 w-full space-y-2">
                {modeIcon === "upload" ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <label
                        htmlFor="branding-logo-icon-file"
                        className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-2xs hover:bg-surface-soft transition-colors"
                      >
                        Pilih Berkas Ikon...
                      </label>
                      <input
                        id="branding-logo-icon-file"
                        type="file"
                        accept=".svg,.png,.ico,.webp,.jpg"
                        onChange={(e) => handleFileUpload(e, "icon")}
                        className="sr-only"
                      />
                      <span className="text-xs text-muted truncate max-w-xs">
                        {fileNameIcon || "Belum ada berkas baru"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted">
                      Rekomendasi rasio 1:1 persegi (misal 32x32px sampai 512x512px). Format SVG, ICO, PNG, WebP.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={logoIconUrl}
                      onChange={(e) => setLogoIconUrl(e.target.value)}
                      placeholder="/network-router-icon.svg atau https://..."
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-hidden"
                    />
                    <p className="text-[11px] text-muted">
                      Jalur berkas publik atau URL gambar favicon.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsResetConfirmOpen(true)}
            disabled={isPending}
            className="text-danger-ink hover:bg-danger-bg"
          >
            Kembalikan ke Default
          </Button>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={isPending || (!isChanged && !fileNameWithText && !fileNameIcon)}
            >
              {isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Konfirmasi Reset Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-w-md w-full space-y-4">
            <h3 className="text-base font-semibold text-foreground">
              Kembalikan ke Pengaturan Default?
            </h3>
            <p className="text-sm text-muted">
              Nama aplikasi akan dikembalikan ke &quot;Web Belajar Jaringan Dasar dan AI Jaringan&quot;, logo dengan teks akan dikembalikan ke desain router bawaan, dan logo simbol dikembalikan ke ikon router.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsResetConfirmOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleReset}
                disabled={isPending}
              >
                {isPending ? "Mereset..." : "Ya, Kembalikan ke Default"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Live Preview Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Pratinjau Tampilan (Live Preview)
          </h2>
          <p className="text-sm text-muted">
            Simulasi visual bagaimana masing-masing logo dan nama aplikasi akan ditampilkan di antarmuka sistem.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* 1. Preview Navbar (Logo dengan Teks) */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                1. Bilah Navigasi (Navbar)
              </span>
              <span className="text-[11px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                Logo + Teks
              </span>
            </div>

            <div className="rounded-xl border border-border bg-surface-soft p-3">
              <div className="flex h-12 items-center px-3.5 bg-surface rounded-lg border border-border shadow-xs overflow-hidden">
                <div className="flex items-center min-w-0 max-w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoWithTextUrl || DEFAULT_BRANDING.logoWithTextUrl}
                    alt={appName}
                    className="h-8 max-h-8 w-auto max-w-full object-contain"
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-muted">
              Logo dengan teks tampil elegan di bilah navigasi utama sebelah tombol menu mobile dan aksi akun.
            </p>
          </div>

          {/* 2. Preview Layar Loading Login (Logo dengan Teks) */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                2. Layar Transisi Login
              </span>
              <span className="text-[11px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                Logo + Teks
              </span>
            </div>

            <div className="rounded-xl border border-border bg-surface-soft p-4 flex flex-col items-center justify-center min-h-[92px]">
              <div className="flex justify-center mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoWithTextUrl || DEFAULT_BRANDING.logoWithTextUrl}
                  alt={appName}
                  className="h-8.5 w-auto object-contain"
                />
              </div>
              <div className="relative h-1 w-32 overflow-hidden rounded-full bg-surface border border-border/60">
                <div className="h-full w-1/2 rounded-full bg-accent animate-pulse" />
              </div>
            </div>

            <p className="text-xs text-muted">
              Animasi transisi yang muncul sesaat setelah pengguna berhasil login sebelum dialihkan ke dashboard.
            </p>
          </div>

          {/* 3. Preview Tab Browser (Logo Simbol Saja) */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                3. Tab Peramban (Favicon)
              </span>
              <span className="text-[11px] font-medium text-muted bg-surface-soft px-2 py-0.5 rounded-full">
                Simbol Saja
              </span>
            </div>

            <div className="rounded-xl border border-border bg-surface-soft p-3">
              <div className="flex h-10 items-center gap-2.5 px-3 bg-surface rounded-t-lg border-t border-x border-border shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoIconUrl || DEFAULT_BRANDING.logoIconUrl}
                  alt="Favicon"
                  className="h-4 w-4 object-contain shrink-0"
                />
                <span className="text-xs font-medium text-foreground truncate max-w-[150px]">
                  {appName}
                </span>
                <span className="text-[10px] text-muted ml-auto">✕</span>
              </div>
              <div className="h-2 bg-surface-soft border-t border-border" />
            </div>

            <p className="text-xs text-muted">
              Ikon simbolis (favicon) yang tampil di tab peramban Google Chrome, Edge, Safari, dan bookmark.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
