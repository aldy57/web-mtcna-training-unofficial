import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { z } from "zod";
import { DEFAULT_BRANDING, getAppBranding } from "../lib/branding-repo.ts";

const brandingInputValidationSchema = z.object({
  appName: z
    .string()
    .trim()
    .min(2, { error: "Nama aplikasi minimal 2 karakter." })
    .max(80, { error: "Nama aplikasi maksimal 80 karakter." }),
  appFullName: z
    .string()
    .trim()
    .min(2, { error: "Nama lengkap aplikasi minimal 2 karakter." })
    .max(150, { error: "Nama lengkap aplikasi maksimal 150 karakter." }),
  logoIconUrl: z
    .string()
    .trim()
    .min(1, { error: "Logo simbol / ikon harus disertakan." })
    .max(2_000_000, { error: "Ukuran berkas logo simbol terlalu besar (maksimal ~1.5MB)." }),
  logoWithTextUrl: z
    .string()
    .trim()
    .min(1, { error: "Logo dengan teks harus disertakan." })
    .max(2_000_000, { error: "Ukuran berkas logo dengan teks terlalu besar (maksimal ~1.5MB)." }),
  logoUrl: z.string().trim().max(2_000_000).optional(),
  faviconUrl: z.string().trim().max(2_000_000).optional(),
});

describe("lib/branding-repo & branding validation — Kustomisasi Nama dan Dual Logo", () => {
  it("DEFAULT_BRANDING memiliki nilai bawaan yang sesuai dan bebas dari kata MIRA", () => {
    assert.equal(
      DEFAULT_BRANDING.appName,
      "Web Belajar Jaringan Dasar dan AI Jaringan",
    );
    assert.equal(
      DEFAULT_BRANDING.appFullName,
      "Web Belajar Jaringan Dasar dan AI Jaringan",
    );
    assert.equal(DEFAULT_BRANDING.logoIconUrl, "/network-router-icon.svg");
    assert.equal(DEFAULT_BRANDING.logoWithTextUrl, "/network-router-logo-text.svg");

    assert.equal(DEFAULT_BRANDING.appName.toLowerCase().includes("mira"), false);
    assert.equal(
      DEFAULT_BRANDING.appFullName.toLowerCase().includes("mira"),
      false,
    );
  });

  it("berkas SVG logo simbol /network-router-icon.svg ada di direktori public dan valid", () => {
    const svgPath = resolve(process.cwd(), "public/network-router-icon.svg");
    assert.equal(existsSync(svgPath), true);

    const svgContent = readFileSync(svgPath, "utf-8");
    assert.equal(svgContent.includes("<svg"), true);
    assert.equal(svgContent.includes("</svg>"), true);
    assert.equal(svgContent.toLowerCase().includes("mira"), false);
    assert.equal(svgContent.toLowerCase().includes("mikrotik"), false);
  });

  it("berkas SVG logo dengan teks /network-router-logo-text.svg ada di direktori public dan valid", () => {
    const svgPath = resolve(process.cwd(), "public/network-router-logo-text.svg");
    assert.equal(existsSync(svgPath), true);

    const svgContent = readFileSync(svgPath, "utf-8");
    assert.equal(svgContent.includes("<svg"), true);
    assert.equal(svgContent.includes("</svg>"), true);
    assert.equal(svgContent.includes("Belajar Jaringan Dasar"), true);
    assert.equal(svgContent.toLowerCase().includes("mira"), false);
    assert.equal(svgContent.toLowerCase().includes("mikrotik"), false);
  });

  it("memvalidasi payload pengaturan branding yang valid dengan kedua logo", () => {
    const valid = {
      appName: "Portal Jaringan Komputer",
      appFullName: "Platform Edukasi Jaringan dan AI Router",
      logoIconUrl: "/custom-icon.svg",
      logoWithTextUrl: "/custom-logo-text.svg",
    };

    const res = brandingInputValidationSchema.safeParse(valid);
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.data.appName, "Portal Jaringan Komputer");
      assert.equal(res.data.logoIconUrl, "/custom-icon.svg");
      assert.equal(res.data.logoWithTextUrl, "/custom-logo-text.svg");
    }
  });

  it("menolak nama aplikasi yang terlalu pendek atau kosong", () => {
    const invalidShort = {
      appName: "A",
      appFullName: "Valid Description",
      logoIconUrl: "/icon.png",
      logoWithTextUrl: "/logo-text.png",
    };

    const res = brandingInputValidationSchema.safeParse(invalidShort);
    assert.equal(res.success, false);
  });

  it("menolak jika salah satu logo kosong", () => {
    const missingIcon = {
      appName: "Valid Name",
      appFullName: "Valid Description",
      logoIconUrl: "",
      logoWithTextUrl: "/logo-text.png",
    };

    const res = brandingInputValidationSchema.safeParse(missingIcon);
    assert.equal(res.success, false);
  });

  it("menerima format data URI base64 wajar untuk kedua upload logo", () => {
    const validDataUri = {
      appName: "Web Jaringan",
      appFullName: "Web Belajar Jaringan Dasar dan AI Jaringan",
      logoIconUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
      logoWithTextUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    };

    const res = brandingInputValidationSchema.safeParse(validDataUri);
    assert.equal(res.success, true);
  });

  it("getAppBranding mengembalikan DEFAULT_BRANDING saat tidak ada koneksi supabase", async () => {
    const branding = await getAppBranding();
    assert.equal(branding.appName, DEFAULT_BRANDING.appName);
    assert.equal(branding.logoIconUrl, DEFAULT_BRANDING.logoIconUrl);
    assert.equal(branding.logoWithTextUrl, DEFAULT_BRANDING.logoWithTextUrl);
  });
});
