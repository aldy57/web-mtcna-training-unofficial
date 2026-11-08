import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/ui/AppShell";
import { getAppBranding } from "@/lib/branding-repo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getAppBranding();
  return {
    title: {
      default: branding.appName,
      template: `%s · ${branding.appName}`,
    },
    description: `${branding.appFullName} — Platform latihan dan pembelajaran jaringan komputer serta AI tutor jaringan.`,
    icons: {
      icon: [
        {
          url:
            branding.logoIconUrl ||
            branding.faviconUrl ||
            "/network-router-icon.svg",
        },
      ],
      shortcut:
        branding.logoIconUrl ||
        branding.faviconUrl ||
        "/network-router-icon.svg",
      apple:
        branding.logoIconUrl ||
        branding.faviconUrl ||
        "/network-router-icon.svg",
    },
  };
}

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
