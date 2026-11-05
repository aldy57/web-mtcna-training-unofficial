"use server";

import {
  deleteConversationInputSchema,
  renameConversationInputSchema,
  type DeleteConversationInput,
  type RenameConversationInput,
} from "@/lib/ai/ai-config";
import { requireUserForAction } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActionResult,
  AiChatMessageRecord,
  AiConversation,
} from "@/lib/types";

interface DbConversationRow {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface DbChatMessageRow {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  tokens_used: number;
  created_at: string;
}

export async function listConversationsAction(): Promise<
  ActionResult<AiConversation[]>
> {
  const auth = await requireUserForAction();
  if (!auth.ok) {
    return auth;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("id, user_id, title, created_at, updated_at")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return { ok: false, error: error.message };
    }

    const conversations: AiConversation[] = (
      (data as DbConversationRow[] | null) ?? []
    ).map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { ok: true, data: conversations };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Gagal memuat daftar riwayat obrolan.";
    return { ok: false, error: message };
  }
}

export async function getConversationMessagesAction(
  conversationId: string,
): Promise<
  ActionResult<{
    conversation: AiConversation;
    messages: AiChatMessageRecord[];
  }>
> {
  const auth = await requireUserForAction();
  if (!auth.ok) {
    return auth;
  }

  if (!conversationId) {
    return { ok: false, error: "ID percakapan tidak valid." };
  }

  try {
    const supabase = await createSupabaseServerClient();

    // 1. Ambil detail sesi percakapan
    const { data: convData, error: convError } = await supabase
      .from("ai_conversations")
      .select("id, user_id, title, created_at, updated_at")
      .eq("id", conversationId)
      .eq("user_id", auth.user.id)
      .maybeSingle<DbConversationRow>();

    if (convError || !convData) {
      return { ok: false, error: "Sesi percakapan tidak ditemukan." };
    }

    // 2. Ambil seluruh pesan dalam percakapan
    const { data: messagesData, error: msgError } = await supabase
      .from("ai_chat_messages")
      .select(
        "id, conversation_id, user_id, role, content, tokens_used, created_at",
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (msgError) {
      return { ok: false, error: msgError.message };
    }

    const conversation: AiConversation = {
      id: convData.id,
      userId: convData.user_id,
      title: convData.title,
      createdAt: convData.created_at,
      updatedAt: convData.updated_at,
    };

    const messages: AiChatMessageRecord[] = (
      (messagesData as DbChatMessageRow[] | null) ?? []
    ).map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      userId: m.user_id,
      role: m.role,
      content: m.content,
      tokensUsed: m.tokens_used,
      createdAt: m.created_at,
    }));

    return {
      ok: true,
      data: {
        conversation,
        messages,
      },
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Gagal memuat pesan riwayat obrolan.";
    return { ok: false, error: message };
  }
}

export async function renameConversationAction(
  input: RenameConversationInput,
): Promise<ActionResult<{ id: string; title: string }>> {
  const auth = await requireUserForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = renameConversationInputSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue =
      parsed.error.issues[0]?.message ?? "Input judul obrolan tidak valid.";
    return { ok: false, error: firstIssue };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("ai_conversations")
      .update({
        title: parsed.data.title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.conversationId)
      .eq("user_id", auth.user.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: { id: parsed.data.conversationId, title: parsed.data.title },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal mengubah judul obrolan.";
    return { ok: false, error: message };
  }
}

export async function deleteConversationAction(
  input: DeleteConversationInput,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireUserForAction();
  if (!auth.ok) {
    return auth;
  }

  const parsed = deleteConversationInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "ID obrolan tidak valid." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", parsed.data.conversationId)
      .eq("user_id", auth.user.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: { id: parsed.data.conversationId } };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menghapus obrolan.";
    return { ok: false, error: message };
  }
}

