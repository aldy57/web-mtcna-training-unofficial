import "server-only";
import {
  callAiChatCompletion,
  type FetchLike,
} from "@/lib/ai/client";
import {
  getCachedAiExplanation,
  saveCachedAiExplanation,
} from "@/lib/ai/explanation-cache";
import {
  buildAskAiMessages,
  buildGeneralExplanationMessages,
  buildPersonalExplanationMessages,
} from "@/lib/ai/prompts";
import type {
  Language,
  OptionKey,
  QuestionWithSolution,
} from "@/lib/types";

export interface GeneralExplanationResult {
  content: string;
  fromCache: boolean;
}

export interface QuotaBoundAiResult {
  content: string;
  tokensUsed: number;
}

export async function getOrGenerateGeneralExplanation(
  question: QuestionWithSolution,
  language: Language,
  options?: {
    envSource?: Record<string, string | undefined>;
    fetchImpl?: FetchLike;
  },
): Promise<GeneralExplanationResult> {
  const cached = await getCachedAiExplanation(question.id, language);
  if (cached) {
    return {
      content: cached.content,
      fromCache: true,
    };
  }

  const messages = buildGeneralExplanationMessages(question, language);
  const completion = await callAiChatCompletion({ messages }, options);

  await saveCachedAiExplanation({
    questionId: question.id,
    language,
    content: completion.content,
    model: completion.model,
  });

  return {
    content: completion.content,
    fromCache: false,
  };
}

export async function generatePersonalExplanation(params: {
  question: QuestionWithSolution;
  selectedOptions: readonly OptionKey[];
  language: Language;
  options?: {
    envSource?: Record<string, string | undefined>;
    fetchImpl?: FetchLike;
  };
}): Promise<QuotaBoundAiResult> {
  const messages = buildPersonalExplanationMessages(
    params.question,
    params.selectedOptions,
    params.language,
  );
  const completion = await callAiChatCompletion(
    { messages },
    params.options,
  );

  return {
    content: completion.content,
    tokensUsed: completion.totalTokens,
  };
}

export async function answerParticipantQuestion(params: {
  question: QuestionWithSolution;
  participantPrompt: string;
  options?: {
    envSource?: Record<string, string | undefined>;
    fetchImpl?: FetchLike;
  };
}): Promise<QuotaBoundAiResult> {
  const messages = buildAskAiMessages(
    params.question,
    params.participantPrompt,
  );
  const completion = await callAiChatCompletion(
    { messages },
    params.options,
  );

  return {
    content: completion.content,
    tokensUsed: completion.totalTokens,
  };
}


