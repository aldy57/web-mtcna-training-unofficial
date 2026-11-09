import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { getAppBranding } from "@/lib/branding-repo";

export const metadata: Metadata = {
  title: "Masuk",
};

export interface LoginPageProps {
  searchParams?: Promise<{ error?: string; next?: string; code?: string }>;
}

async function LoginContent({
  searchParamsPromise,
}: {
  searchParamsPromise?: Promise<{ error?: string; next?: string; code?: string }>;
}) {
  const [branding, params] = await Promise.all([
    getAppBranding(),
    searchParamsPromise ? searchParamsPromise : Promise.resolve(undefined),
  ]);

  // Jika terdapat parameter auth code dari OAuth (misal karena fallback Site URL Supabase),
  // segera alihkan ke /auth/callback agar sesi berhasil ditukar dan disimpan.
  if (params?.code) {
    const callbackParams = new URLSearchParams();
    callbackParams.set("code", params.code);
    if (params.next) {
      callbackParams.set("next", params.next);
    }
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  return (
    <LoginForm
      branding={branding}
      initialError={params?.error}
      nextUrl={params?.next}
    />
  );
}

function LoginLoading() {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded-md bg-surface-soft" />
        <div className="h-8 w-56 animate-pulse rounded-md bg-surface-soft" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-surface-soft" />
      </div>
      <div className="h-80 rounded-2xl border border-border bg-surface-soft animate-pulse" />
    </div>
  );
}

export default function LoginPage(props: LoginPageProps) {
  return (
    <div className="w-full">
      <Suspense fallback={<LoginLoading />}>
        <LoginContent searchParamsPromise={props.searchParams} />
      </Suspense>
    </div>
  );
}
