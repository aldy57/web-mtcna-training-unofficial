import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Daftar Akun",
};

export interface RegisterPageProps {
  searchParams?: Promise<{ error?: string; next?: string }>;
}

async function RegisterContent({
  searchParamsPromise,
}: {
  searchParamsPromise?: Promise<{ error?: string; next?: string }>;
}) {
  const params = searchParamsPromise
    ? await searchParamsPromise
    : undefined;

  return (
    <RegisterForm initialError={params?.error} nextUrl={params?.next} />
  );
}

function RegisterLoading() {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded-md bg-surface-soft" />
        <div className="h-8 w-56 animate-pulse rounded-md bg-surface-soft" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-surface-soft" />
      </div>
      <div className="h-96 rounded-2xl border border-border bg-surface-soft animate-pulse" />
    </div>
  );
}

export default function RegisterPage(props: RegisterPageProps) {
  return (
    <div className="w-full">
      <Suspense fallback={<RegisterLoading />}>
        <RegisterContent searchParamsPromise={props.searchParams} />
      </Suspense>
    </div>
  );
}
