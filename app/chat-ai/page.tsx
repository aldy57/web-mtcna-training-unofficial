import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatAiView } from "@/components/ai/ChatAiView";
import { getEffectiveActiveAiModels } from "@/lib/ai/dynamic-settings";
import { getUserAiQuotaStatus } from "@/lib/ai/quota";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Chat AI · Tutor Cerdas Jaringan & MTCNA",
  description:
    "Tutor cerdas untuk fundamental jaringan komputer, cara kerja internet, dan konfigurasi MikroTik RouterOS MTCNA.",
};

interface ChatAiPageProps {
  searchParams: Promise<{ c?: string }>;
}

async function ChatAiContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ c?: string }>;
}) {
  const [user, searchParams] = await Promise.all([
    getCurrentUser(),
    searchParamsPromise,
  ]);
  const conversationKey = searchParams?.c || "new";

  const [initialQuota, activeModels] = await Promise.all([
    user.role === "user" ? getUserAiQuotaStatus(user.id) : Promise.resolve(null),
    getEffectiveActiveAiModels(),
  ]);

  return (
    <div className="-my-6 sm:-my-8 w-full h-[calc(100dvh-4rem)] flex flex-col min-h-0 overflow-hidden">
      <ChatAiView
        key={conversationKey}
        initialQuota={initialQuota}
        userRole={user.role}
        userName={user.fullName || user.email || "Peserta"}
        activeModels={activeModels}
      />
    </div>
  );
}

export default function ChatAiPage(props: ChatAiPageProps) {
  return (
    <Suspense
      fallback={
        <div className="-my-6 sm:-my-8 max-w-4xl mx-auto w-full h-[calc(100dvh-4rem)] flex flex-col justify-center p-4">
          <div className="h-64 w-full animate-pulse rounded-2xl bg-surface-soft" />
        </div>
      }
    >
      <ChatAiContent searchParamsPromise={props.searchParams} />
    </Suspense>
  );
}

