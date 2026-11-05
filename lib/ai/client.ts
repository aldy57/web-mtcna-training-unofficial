import "server-only";
import { z } from "zod";
import {
  AI_ESTIMATED_FALLBACK_TOKENS,
  AI_MAX_COMPLETION_TOKENS,
  AI_REQUEST_TIMEOUT_MS,
  getAiServerConfig,
} from "@/lib/ai/ai-config";
import { fetchDynamicAiSettings } from "@/lib/ai/dynamic-settings";

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiChatCompletionRequest {
  messages: AiChatMessage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface AiChatCompletionResult {
  content: string;
  model: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
}

const chatCompletionResponseSchema = z.object({
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
        }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative().optional(),
      completion_tokens: z.number().int().nonnegative().optional(),
      total_tokens: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

export type FetchLike = typeof fetch;

export function parseChatCompletionPayload(
  rawPayload: unknown,
  fallbackModel: string,
): AiChatCompletionResult {
  const parsed = chatCompletionResponseSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw new Error("Respons layanan AI tidak sesuai format yang diharapkan.");
  }

  const rawContent = parsed.data.choices[0]?.message.content?.trim() ?? "";
  if (!rawContent) {
    throw new Error("Layanan AI mengembalikan jawaban kosong.");
  }

  const promptTokens = parsed.data.usage?.prompt_tokens ?? 0;
  const completionTokens = parsed.data.usage?.completion_tokens ?? 0;
  const explicitTotal = parsed.data.usage?.total_tokens ?? 0;
  const computedTotal =
    explicitTotal > 0 ? explicitTotal : promptTokens + completionTokens;
  const totalTokens =
    computedTotal > 0 ? computedTotal : AI_ESTIMATED_FALLBACK_TOKENS;

  return {
    content: rawContent,
    model: parsed.data.model || fallbackModel,
    totalTokens,
    promptTokens,
    completionTokens,
  };
}

export async function callAiChatCompletion(
  request: AiChatCompletionRequest,
  options?: {
    envSource?: Record<string, string | undefined>;
    fetchImpl?: FetchLike;
  },
): Promise<AiChatCompletionResult> {
  if (!options?.envSource || options.envSource === process.env) {
    await fetchDynamicAiSettings();
  }
  const config = getAiServerConfig(options?.envSource);
  const fetchFn = options?.fetchImpl ?? fetch;
  const targetModel = request.model || config.model;
  const endpoint = `${config.baseUrl}/chat/completions`;

  const controller = new AbortController();
  const timeoutHandle = setTimeout(
    () => controller.abort(),
    AI_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetchFn(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: request.messages,
        max_tokens: request.maxTokens ?? AI_MAX_COMPLETION_TOKENS,
        temperature: request.temperature ?? 0.3,
        stream: false,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Autentikasi layanan AI ditolak. Periksa kembali konfigurasi AI_API_KEY di server.",
        );
      }
      if (response.status === 429) {
        throw new Error(
          "Layanan AI sedang sibuk atau kuota global telah habis. Silakan coba beberapa saat lagi.",
        );
      }
      throw new Error(
        `Layanan AI gagal merespons (kode status ${response.status}).`,
      );
    }

    const payload: unknown = await response.json();
    return parseChatCompletionPayload(payload, targetModel);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Waktu tunggu layanan AI habis. Silakan coba kembali.",
      );
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Terjadi gangguan saat menghubungi layanan AI.");
  } finally {
    clearTimeout(timeoutHandle);
  }
}

