import "server-only";
import { getAiBudgetSettings } from "@/lib/ai/ai-config";
import { fetchDynamicAiSettings } from "@/lib/ai/dynamic-settings";
import { getGlobalAiQuotaStatus } from "@/lib/ai/global-quota";
import { calculateQuotaStatus } from "@/lib/ai/quota";
import { getQuestionBank } from "@/lib/questions-repo";
import { calculateScorePercent } from "@/lib/scoring";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AiDynamicSettings,
  AiGlobalQuotaStatus,
  AiQuotaStatus,
  Language,
  QuestionRecord,
  QuizMode,
  Role,
  UserProfile,
} from "@/lib/types";

export interface AdminAttemptOverview {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  mode: QuizMode;
  language: Language;
  topic: string | null;
  scorePercent: number | null;
  status: string;
  startedAt: string;
}

export interface AdminAuditEntry {
  id: string;
  action: string;
  targetId: string;
  createdAt: string;
  details: Record<string, unknown>;
}

export interface AdminAiManagementData {
  aiGlobalStatus: AiGlobalQuotaStatus;
  participants: UserProfile[];
  participantQuotas: Record<string, AiQuotaStatus>;
  cachedExplanationCount: number;
  dynamicSettings: AiDynamicSettings;
}

export interface AdminMetricsData {
  totalParticipants: number;
  totalAdmins: number;
  totalQuestions: number;
  completedTryoutCount: number;
  averageTryoutScore: number | null;
}

export interface AdminDashboardData {
  users: UserProfile[];
  questions: QuestionRecord[];
  recentAttempts: AdminAttemptOverview[];
  auditLogs: AdminAuditEntry[];
  aiGlobalStatus: AiGlobalQuotaStatus;
  participantQuotas: Record<string, AiQuotaStatus>;
  cachedExplanationCount: number;
  metrics: AdminMetricsData;
}

interface DbProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
}

interface DbAttemptRow {
  id: string;
  user_id: string;
  mode: QuizMode;
  lang: Language;
  topic: string | null;
  score: number | string | null;
  status: string;
  started_at: string;
}

interface DbAuditRow {
  id: string;
  action: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

interface DbQuotaRow {
  user_id: string;
  tokens_used: number;
  period_started_at: string;
  reset_at: string | null;
}

export async function getAdminUsers(): Promise<UserProfile[]> {
  const adminClient = createSupabaseAdminClient();
  const { data } = await adminClient
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false })
    .returns<DbProfileRow[]>();

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role === "admin" ? "admin" : "user",
    createdAt: row.created_at,
  }));
}

export async function getAdminQuestions(): Promise<QuestionRecord[]> {
  const questionBank = await getQuestionBank();
  return questionBank.questions;
}

export async function getAdminAiData(): Promise<AdminAiManagementData> {
  const adminClient = createSupabaseAdminClient();
  const { userTokenBudget } = getAiBudgetSettings();
  const nowIso = new Date().toISOString();

  const [users, quotasRes, cacheCountRes, aiGlobalStatus, dynamicSettings] =
    await Promise.all([
      getAdminUsers(),
      adminClient
        .from("ai_user_quotas")
        .select("user_id, tokens_used, period_started_at, reset_at")
        .returns<DbQuotaRow[]>(),
      adminClient
        .from("ai_explanations")
        .select("question_id", { count: "exact", head: true }),
      getGlobalAiQuotaStatus(),
      fetchDynamicAiSettings(true),
    ]);

  const participants = users.filter((u) => u.role === "user");
  const quotaRowMap = new Map(
    (quotasRes.data ?? []).map((row) => [row.user_id, row]),
  );

  const participantQuotas: Record<string, AiQuotaStatus> = {};
  for (const participant of participants) {
    const row = quotaRowMap.get(participant.id);
    participantQuotas[participant.id] = calculateQuotaStatus({
      userId: participant.id,
      tokensUsed: row?.tokens_used ?? 0,
      periodStartedAt: row?.period_started_at ?? nowIso,
      resetAt: row?.reset_at ?? null,
      tokenBudget: userTokenBudget,
      nowIso,
    });
  }

  return {
    aiGlobalStatus,
    participants,
    participantQuotas,
    cachedExplanationCount: cacheCountRes.count ?? 0,
    dynamicSettings,
  };
}

export async function getAdminRecentAttempts(
  limit: number = 50,
): Promise<AdminAttemptOverview[]> {
  const adminClient = createSupabaseAdminClient();

  const [attemptsRes, users] = await Promise.all([
    adminClient
      .from("attempts")
      .select("id, user_id, mode, lang, topic, score, status, started_at")
      .order("started_at", { ascending: false })
      .limit(limit)
      .returns<DbAttemptRow[]>(),
    getAdminUsers(),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));

  return (attemptsRes.data ?? []).map((row) => {
    const owner = userMap.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      userEmail: owner?.email ?? "—",
      userName: owner?.fullName || owner?.email || "Peserta",
      mode: row.mode,
      language: row.lang,
      topic: row.topic,
      scorePercent: row.score === null ? null : Number(row.score),
      status: row.status,
      startedAt: row.started_at,
    };
  });
}

export async function getAdminAuditLogs(
  limit: number = 50,
): Promise<AdminAuditEntry[]> {
  const adminClient = createSupabaseAdminClient();
  const { data } = await adminClient
    .from("admin_audit_log")
    .select("id, action, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<DbAuditRow[]>();

  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    targetId: row.target_id,
    createdAt: row.created_at,
    details: row.details ?? {},
  }));
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [users, questions, recentAttempts, auditLogs, aiData] =
    await Promise.all([
      getAdminUsers(),
      getAdminQuestions(),
      getAdminRecentAttempts(20),
      getAdminAuditLogs(10),
      getAdminAiData(),
    ]);

  const completedTryouts = recentAttempts.filter(
    (item) => item.mode === "tryout" && item.scorePercent !== null,
  );

  const totalScoreSum = completedTryouts.reduce(
    (acc, item) => acc + (item.scorePercent ?? 0),
    0,
  );

  const averageTryoutScore =
    completedTryouts.length > 0
      ? calculateScorePercent(totalScoreSum, completedTryouts.length * 100)
      : null;

  return {
    users,
    questions,
    recentAttempts,
    auditLogs,
    aiGlobalStatus: aiData.aiGlobalStatus,
    participantQuotas: aiData.participantQuotas,
    cachedExplanationCount: aiData.cachedExplanationCount,
    metrics: {
      totalParticipants: users.filter((u) => u.role === "user").length,
      totalAdmins: users.filter((u) => u.role === "admin").length,
      totalQuestions: questions.length,
      completedTryoutCount: completedTryouts.length,
      averageTryoutScore,
    },
  };
}
