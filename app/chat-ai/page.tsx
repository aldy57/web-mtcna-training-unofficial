import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatAiView } from "@/components/ai/ChatAiView";
import { getUserAiQuotaStatus } from "@/lib/ai/quota";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "MIRA AI · Tutor Cerdas Jaringan & MTCNA",
  description:
    "Tutor cerdas untuk fundamental jaringan komputer, cara kerja internet, dan konfigurasi MikroTik RouterOS MTCNA.",
};

async function ChatAiContent() {
  const user = await getCurrentUser();
  const initialQuota =
    user.role === "user" ? await getUserAiQuotaStatus(user.id) : null;

  return (
    <div className="-my-6 sm:-my-8 w-full h-[calc(100dvh-4rem)] flex flex-col min-h-0 overflow-hidden">
      <ChatAiView
        initialQuota={initialQuota}
        userRole={user.role}
        userName={user.fullName || user.email || "Peserta"}
      />
    </div>
  );
}

export default function ChatAiPage() {
  return (
    <Suspense
      fallback={
        <div className="-my-6 sm:-my-8 max-w-4xl mx-auto w-full h-[calc(100dvh-4rem)] flex flex-col justify-center p-4">
          <div className="h-64 w-full animate-pulse rounded-2xl bg-surface-soft" />
        </div>
      }
    >
      <ChatAiContent />
    </Suspense>
  );
}

