import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { getAppBranding } from "@/lib/branding-repo";

export const metadata: Metadata = {
  title: "Masuk",
};

export interface LoginPageProps {
  searchParams?: Promise<{ error?: string; next?: string }>;
}

async function LoginContent({
  searchParamsPromise,
}: {
  searchParamsPromise?: Promise<{ error?: string; next?: string }>;
}) {
  const [branding, params] = await Promise.all([
    getAppBranding(),
    searchParamsPromise ? searchParamsPromise : Promise.resolve(undefined),
  ]);

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
