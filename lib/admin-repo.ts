import "server-only";
import { getQuestionBank } from "@/lib/questions-repo";
import { calculateScorePercent } from "@/lib/scoring";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
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

export interface AdminDashboardData {
  users: UserProfile[];
  questions: QuestionRecord[];
  recentAttempts: AdminAttemptOverview[];
  auditLogs: AdminAuditEntry[];
  metrics: {
    totalParticipants: number;
    totalAdmins: number;
    totalQuestions: number;
    completedTryoutCount: number;
    averageTryoutScore: number | null;
  };
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

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const adminClient = createSupabaseAdminClient();

  const [profilesRes, attemptsRes, auditRes, questionBank] = await Promise.all([
    adminClient
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: false })
      .returns<DbProfileRow[]>(),
    adminClient
      .from("attempts")
      .select("id, user_id, mode, lang, topic, score, status, started_at")
      .order("started_at", { ascending: false })
      .limit(40)
      .returns<DbAttemptRow[]>(),
    adminClient
      .from("admin_audit_log")
      .select("id, action, target_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<DbAuditRow[]>(),
    getQuestionBank(),
  ]);

  const users: UserProfile[] = (profilesRes.data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role === "admin" ? "admin" : "user",
    createdAt: row.created_at,
  }));

  const userMap = new Map(users.map((u) => [u.id, u]));

  const recentAttempts: AdminAttemptOverview[] = (attemptsRes.data ?? []).map(
    (row) => {
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
    },
  );

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

  const auditLogs: AdminAuditEntry[] = (auditRes.data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    targetId: row.target_id,
    createdAt: row.created_at,
    details: row.details ?? {},
  }));

  return {
    users,
    questions: questionBank.questions,
    recentAttempts,
    auditLogs,
    metrics: {
      totalParticipants: users.filter((u) => u.role === "user").length,
      totalAdmins: users.filter((u) => u.role === "admin").length,
      totalQuestions: questionBank.questions.length,
      completedTryoutCount: completedTryouts.length,
      averageTryoutScore,
    },
  };
}

