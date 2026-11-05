import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatAiView } from "@/components/ai/ChatAiView";
import { getUserAiQuotaStatus } from "@/lib/ai/quota";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "MIRA AI · Tutor Cerdas RouterOS",
  description:
    "Konsultasi cerdas materi sertifikasi MikroTik MTCNA, konsep jaringan, dan sintaks CLI RouterOS bersama MIRA AI.",
};

async function ChatAiContent() {
  const user = await getCurrentUser();
  const initialQuota =
    user.role === "user" ? await getUserAiQuotaStatus(user.id) : null;

  return (
    <div className="w-full">
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
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-16 w-full animate-pulse rounded-2xl bg-surface-soft" />
          <div className="h-[calc(100vh-14rem)] w-full animate-pulse rounded-2xl bg-surface-soft" />
        </div>
      }
    >
      <ChatAiContent />
    </Suspense>
  );
}

