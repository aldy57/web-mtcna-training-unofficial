import "server-only";

import fallbackBankJson from "@/data/questions.json";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { QuestionBankData, ReferenceSource } from "@/lib/types";

const FALLBACK_BANK = fallbackBankJson as unknown as QuestionBankData;

interface DbRefRow {
  id: string;
  title: string;
  url: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export async function getAllMaterials(): Promise<ReferenceSource[]> {
  if (!hasSupabasePublicEnv()) {
    return Object.values(FALLBACK_BANK.references);
  }

  try {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("refs")
      .select("id, title, url, description, created_at, updated_at")
      .order("id", { ascending: true });

    if (error || !data || data.length === 0) {
      return Object.values(FALLBACK_BANK.references);
    }

    return (data as DbRefRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      description: row.description || "",
      createdAt: row.created_at || undefined,
      updatedAt: row.updated_at || undefined,
    }));
  } catch {
    return Object.values(FALLBACK_BANK.references);
  }
}

export async function getMaterialUsageMap(): Promise<Record<string, string[]>> {
  const usageMap: Record<string, string[]> = {};

  if (!hasSupabasePublicEnv()) {
    for (const q of FALLBACK_BANK.questions) {
      for (const sId of q.sourceIds) {
        if (!usageMap[sId]) usageMap[sId] = [];
        usageMap[sId].push(q.id);
      }
    }
    return usageMap;
  }

  try {
    const adminClient = createSupabaseAdminClient();
    const { data } = await adminClient
      .from("questions")
      .select("id, source_ids");

    if (data && data.length > 0) {
      for (const row of data as Array<{ id: string; source_ids: string[] }>) {
        for (const sId of row.source_ids ?? []) {
          if (!usageMap[sId]) usageMap[sId] = [];
          usageMap[sId].push(row.id);
        }
      }
      return usageMap;
    }
  } catch {
    // Abaikan dan gunakan fallback
  }

  for (const q of FALLBACK_BANK.questions) {
    for (const sId of q.sourceIds) {
      if (!usageMap[sId]) usageMap[sId] = [];
      usageMap[sId].push(q.id);
    }
  }
  return usageMap;
}

