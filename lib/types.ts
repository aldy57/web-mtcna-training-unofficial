import type {
  AI_FEATURES,
  APP_ROLES,
  ATTEMPT_STATUSES,
  OPTION_KEYS,
  QUESTION_KINDS,
  QUIZ_MODES,
  SUPPORTED_LANGUAGES,
} from "@/lib/constants";
import type { TOPIC_KEYS } from "@/lib/topics";

export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export type Role = (typeof APP_ROLES)[number];
export type TopicKey = (typeof TOPIC_KEYS)[number];
export type QuestionKind = (typeof QUESTION_KINDS)[number];
export type OptionKey = (typeof OPTION_KEYS)[number];
export type QuizMode = (typeof QUIZ_MODES)[number];
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];
export type AiFeature = (typeof AI_FEATURES)[number];


export type QuestionOptions = Record<OptionKey, string>;

export interface ReferenceSource {
  id: string;
  title: string;
  url: string;
}

export interface QuestionTranslationContent {
  body: string;
  options: QuestionOptions;
  explanation: string;
}

export interface QuestionRecord {
  id: string;
  topic: TopicKey;
  kind: QuestionKind;
  sortOrder: number;
  sourceIds: string[];
  answerKey: string;
  translations: Record<Language, QuestionTranslationContent>;
}

/**
 * Question payload safe to send to the client during an active quiz
 * before the answer key and explanation are unlocked.
 */
export interface QuestionPublic {
  id: string;
  topic: TopicKey;
  kind: QuestionKind;
  sortOrder: number;
  body: string;
  options: QuestionOptions;
}

/**
 * Question payload unlocked after saving an answer in study mode
 * or after finishing a tryout/remedial session.
 */
export interface QuestionWithSolution extends QuestionPublic {
  answerKey: string;
  explanation: string;
  sources: ReferenceSource[];
}

export interface QuestionBankData {
  version: number;
  extractedAt: string;
  questionCount: number;
  tryoutOrderIds: string[];
  references: Record<string, ReferenceSource>;
  questions: QuestionRecord[];
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
}

export interface AttemptAnswer {
  attemptId: string;
  questionId: string;
  selectedOptions: OptionKey[];
  isMarked: boolean;
  isCorrect: boolean | null;
}

export interface Attempt {
  id: string;
  userId: string;
  parentAttemptId: string | null;
  mode: QuizMode;
  language: Language;
  topic: TopicKey | null;
  questionIds: string[];
  startedAt: string;
  deadlineAt: string | null;
  finishedAt: string | null;
  scorePercent: number | null;
  status: AttemptStatus;
}

export interface TopicScoreRow {
  topic: TopicKey;
  topicLabel: string;
  correctCount: number;
  totalCount: number;
  scorePercent: number;
}

export interface QuizResultSummary {
  attemptId: string;
  mode: QuizMode;
  language: Language;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  scorePercent: number;
  hasPassed: boolean;
  isExpired: boolean;
  topicBreakdown: TopicScoreRow[];
  weakestTopics: TopicScoreRow[];
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export interface AiQuotaStatus {
  userId: string;
  tokensUsed: number;
  tokenBudget: number;
  usedPercent: number;
  remainingPercent: number;
  isExhausted: boolean;
  periodStartedAt: string;
  resetAt: string | null;
}

export interface AiUsageLogEntry {
  id: string;
  userId: string;
  feature: AiFeature;
  questionId: string | null;
  attemptId: string | null;
  percentUsed: number;
  createdAt: string;
}

export interface AiGlobalQuotaStatus {
  isEnabled: boolean;
  isAvailable: boolean;
  remainingPercent: number | null;
  usedPercent: number | null;
  totalTokens?: number | null;
  usedTokens?: number | null;
  remainingTokens?: number | null;
  isLowWarning: boolean;
  isExhausted: boolean;
  source: "remote" | "fallback";
  responseNote?: string | null;
  endpointUrl?: string | null;
  checkedAt: string;
}

export interface AiExplanationRecord {
  questionId: string;
  language: Language;
  content: string;
  createdAt: string;
}

export interface AiRecommendationRecord {
  attemptId: string;
  userId: string;
  language: Language;
  content: string;
  createdAt: string;
}


