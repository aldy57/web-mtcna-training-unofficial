import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { getAppBranding } from "@/lib/branding-repo";

export const metadata: Metadata = {
  title: "Masuk",
};

export default async function LoginPage() {
  const branding = await getAppBranding();

  return (
    <div className="w-full">
      <LoginForm branding={branding} />
    </div>
  );
}

