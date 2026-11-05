import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/ui/AppShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MIRA · MikroTik Intelligence Review & Assessment",
    template: "%s · MIRA",
  },
  description:
    "MIRA (MikroTik Intelligence Review & Assessment) — Platform latihan sertifikasi MikroTik MTCNA, simulasi tryout dwibahasa (Indonesia & English), dan tutor cerdas RouterOS.",
  icons: {
    icon: [
      { url: "/mira.svg", type: "image/svg+xml" },
      { url: "/mira.png", type: "image/png" },
    ],
    shortcut: "/mira.png",
    apple: "/mira.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
