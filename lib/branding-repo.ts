import "server-only";
import { DEFAULT_BRANDING } from "@/lib/constants";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AppBrandingInput, AppBrandingSettings } from "@/lib/types";

export { DEFAULT_BRANDING };

interface AppBrandingRow {
  id: string;
  app_name: string;
  app_full_name: string;
  logo_icon_url?: string | null;
  logo_with_text_url?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  updated_at: string;
  updated_by: string | null;
}

let cachedBranding: AppBrandingSettings | null = null;

export function invalidateBrandingCache(): void {
  cachedBranding = null;
}

export async function getAppBranding(): Promise<AppBrandingSettings> {
  if (cachedBranding) {
    return cachedBranding;
  }

  if (!hasSupabasePublicEnv()) {
    return DEFAULT_BRANDING;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("app_branding")
      .select("*")
      .eq("id", "default")
      .maybeSingle<AppBrandingRow>();

    if (error || !data) {
      return DEFAULT_BRANDING;
    }

    const logoIcon =
      data.logo_icon_url?.trim() ||
      data.favicon_url?.trim() ||
      DEFAULT_BRANDING.logoIconUrl;
    const logoWithText =
      data.logo_with_text_url?.trim() ||
      data.logo_url?.trim() ||
      DEFAULT_BRANDING.logoWithTextUrl;

    const resolved: AppBrandingSettings = {
      appName: data.app_name?.trim() || DEFAULT_BRANDING.appName,
      appFullName: data.app_full_name?.trim() || DEFAULT_BRANDING.appFullName,
      logoIconUrl: logoIcon,
      logoWithTextUrl: logoWithText,
      logoUrl: logoWithText,
      faviconUrl: logoIcon,
      updatedAt: data.updated_at,
      updatedBy: data.updated_by,
    };

    cachedBranding = resolved;
    return resolved;
  } catch {
    return DEFAULT_BRANDING;
  }
}

export async function updateAppBranding(
  input: AppBrandingInput,
  adminUserId: string,
): Promise<AppBrandingSettings> {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const logoIcon = input.logoIconUrl?.trim() || DEFAULT_BRANDING.logoIconUrl;
  const logoWithText =
    input.logoWithTextUrl?.trim() || DEFAULT_BRANDING.logoWithTextUrl;

  const payload = {
    id: "default",
    app_name: input.appName.trim() || DEFAULT_BRANDING.appName,
    app_full_name: input.appFullName.trim() || DEFAULT_BRANDING.appFullName,
    logo_icon_url: logoIcon,
    logo_with_text_url: logoWithText,
    logo_url: logoWithText,
    favicon_url: logoIcon,
    updated_at: now,
    updated_by: adminUserId,
  };

  const { error } = await supabase
    .from("app_branding")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    throw new Error(`Gagal menyimpan pengaturan branding: ${error.message}`);
  }

  invalidateBrandingCache();

  return {
    appName: payload.app_name,
    appFullName: payload.app_full_name,
    logoIconUrl: payload.logo_icon_url,
    logoWithTextUrl: payload.logo_with_text_url,
    logoUrl: payload.logo_url,
    faviconUrl: payload.favicon_url,
    updatedAt: now,
    updatedBy: adminUserId,
  };
}

export async function resetAppBranding(
  adminUserId: string,
): Promise<AppBrandingSettings> {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const payload = {
    id: "default",
    app_name: DEFAULT_BRANDING.appName,
    app_full_name: DEFAULT_BRANDING.appFullName,
    logo_icon_url: DEFAULT_BRANDING.logoIconUrl,
    logo_with_text_url: DEFAULT_BRANDING.logoWithTextUrl,
    logo_url: DEFAULT_BRANDING.logoWithTextUrl,
    favicon_url: DEFAULT_BRANDING.logoIconUrl,
    updated_at: now,
    updated_by: adminUserId,
  };

  const { error } = await supabase
    .from("app_branding")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    throw new Error(`Gagal mereset pengaturan branding: ${error.message}`);
  }

  invalidateBrandingCache();

  return {
    ...DEFAULT_BRANDING,
    updatedAt: now,
    updatedBy: adminUserId,
  };
}
