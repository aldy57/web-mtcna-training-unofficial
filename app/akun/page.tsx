import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountSettingsForms } from "@/components/auth/AccountSettingsForms";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Pengaturan Akun",
};

async function AccountSettingsContent() {
  const user = await getCurrentUser();
  return <AccountSettingsForms user={user} />;
}

export default function AccountPage() {
  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Pengaturan
        </p>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Kelola Akun &amp; Keamanan
        </h1>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64 animate-pulse rounded-2xl bg-surface-soft" />
            <div className="h-64 animate-pulse rounded-2xl bg-surface-soft" />
          </div>
        }
      >
        <AccountSettingsContent />
      </Suspense>
    </div>
  );
}

