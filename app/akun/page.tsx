import type { Metadata } from "next";
import { Suspense } from "react";
import { AiQuotaBar } from "@/components/ai/AiQuotaBar";
import { AiUsageHistory } from "@/components/ai/AiUsageHistory";
import { AccountSettingsForms } from "@/components/auth/AccountSettingsForms";
import {
  getUserAiQuotaStatus,
  getUserAiUsageHistory,
} from "@/lib/ai/quota";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Pengaturan Akun",
};

async function AccountSettingsContent() {
  const user = await getCurrentUser();

  if (user.role !== "user") {
    return <AccountSettingsForms user={user} />;
  }

  const [quota, usageLogs] = await Promise.all([
    getUserAiQuotaStatus(user.id),
    getUserAiUsageHistory(user.id, 100),
  ]);

  return (
    <div className="space-y-6">
      <AccountSettingsForms user={user} />
      <AiQuotaBar quota={quota} />
      <AiUsageHistory logs={usageLogs} />
    </div>
  );
}


export default function AccountPage() {
  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Pengaturan Akun
        </p>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Kelola Akun Anda
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

