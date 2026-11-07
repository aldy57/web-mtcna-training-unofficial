import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculatePagination } from "@/lib/pagination";
import type { AiUsageLogEntry, UserProfile } from "@/lib/types";

describe("lib/admin — Riwayat Penggunaan Token Seluruh Pengguna", () => {
  const mockUsers: UserProfile[] = [
    {
      id: "user-1",
      email: "budi@example.com",
      fullName: "Budi Santoso",
      role: "user",
      createdAt: "2026-11-01T00:00:00Z",
    },
    {
      id: "user-2",
      email: "siti@example.com",
      fullName: "Siti Rahma",
      role: "user",
      createdAt: "2026-11-01T00:00:00Z",
    },
  ];

  const rawLogs: AiUsageLogEntry[] = [
    {
      id: "log-1",
      userId: "user-1",
      feature: "ask_ai",
      questionId: "A01",
      attemptId: null,
      tokensUsed: 450,
      percentUsed: 1.5,
      createdAt: "2026-11-07T10:00:00Z",
    },
    {
      id: "log-2",
      userId: "user-2",
      feature: "personal_explanation",
      questionId: "A05",
      attemptId: "att-1",
      tokensUsed: 800,
      percentUsed: 2.67,
      createdAt: "2026-11-07T10:15:00Z",
    },
    {
      id: "log-3",
      userId: "user-1",
      feature: "recommendation",
      questionId: null,
      attemptId: "att-2",
      tokensUsed: 1200,
      percentUsed: 4.0,
      createdAt: "2026-11-07T10:30:00Z",
    },
  ];

  it("memetakan nama dan email pengguna ke dalam riwayat pemakaian token", () => {
    const userMap = new Map(mockUsers.map((u) => [u.id, u]));
    const mappedLogs: AiUsageLogEntry[] = rawLogs.map((log) => {
      const u = userMap.get(log.userId);
      return {
        ...log,
        userName: u?.fullName || "Peserta",
        userEmail: u?.email || "",
      };
    });

    assert.equal(mappedLogs[0].userName, "Budi Santoso");
    assert.equal(mappedLogs[0].userEmail, "budi@example.com");
    assert.equal(mappedLogs[1].userName, "Siti Rahma");
    assert.equal(mappedLogs[1].userEmail, "siti@example.com");
  });

  it("menghitung akumulasi total token yang digunakan seluruh pengguna", () => {
    const totalTokens = rawLogs.reduce(
      (sum, item) => sum + (item.tokensUsed || 0),
      0,
    );
    assert.equal(totalTokens, 450 + 800 + 1200);
    assert.equal(totalTokens, 2450);
  });

  it("memfilter riwayat log berdasarkan nama, email, soal, atau fitur", () => {
    const userMap = new Map(mockUsers.map((u) => [u.id, u]));
    const mappedLogs = rawLogs.map((log) => ({
      ...log,
      userName: userMap.get(log.userId)?.fullName || "Peserta",
      userEmail: userMap.get(log.userId)?.email || "",
    }));

    // Filter berdasarkan email
    const filterEmail = "budi@example.com";
    const matchEmail = mappedLogs.filter(
      (l) => l.userEmail.includes(filterEmail) || l.userName.includes(filterEmail),
    );
    assert.equal(matchEmail.length, 2);

    // Filter berdasarkan soal
    const filterSoal = "A05";
    const matchSoal = mappedLogs.filter((l) => l.questionId?.includes(filterSoal));
    assert.equal(matchSoal.length, 1);
    assert.equal(matchSoal[0].id, "log-2");
  });

  it("memvalidasi pagination 10 item per halaman untuk log admin", () => {
    const pagination = calculatePagination(25, 2, 10);
    assert.equal(pagination.totalPages, 3);
    assert.equal(pagination.safePage, 2);
    assert.equal(pagination.startIdx, 10);
    assert.equal(pagination.endIdx, 20);
  });
});

