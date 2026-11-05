import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deleteConversationInputSchema,
  generateConversationTitle,
  renameConversationInputSchema,
} from "@/lib/ai/ai-config";
import { groupConversationsByDate } from "@/lib/ai/chat-history-utils";
import type { AiConversation } from "@/lib/types";

describe("lib/ai — Riwayat Obrolan & Kelanjutan Chat MIRA AI", () => {
  it("membuat judul obrolan otomatis dari pertanyaan pertama peserta", () => {
    // Kurang dari 40 karakter
    const shortPrompt = "Bagaimana cara setting NAT Masquerade?";
    assert.equal(generateConversationTitle(shortPrompt), shortPrompt);

    // Lebih dari 40 karakter dipotong rapi dengan elipsis
    const longPrompt =
      "Jelaskan secara mendalam tentang arsitektur MikroTik RouterOS v7 dan perbedaan kernel v6!";
    const title = generateConversationTitle(longPrompt);
    assert.equal(title.length <= 40, true);
    assert.equal(title.endsWith("..."), true);

    // Menghilangkan newline & tab
    const multilinePrompt = "Halo MIRA AI,\n\nbelajar\tsubnetting";
    assert.equal(
      generateConversationTitle(multilinePrompt),
      "Halo MIRA AI, belajar subnetting",
    );

    // Fallback default bila prompt kosong
    assert.equal(generateConversationTitle("   "), "Obrolan Baru");
  });

  it("mengelompokkan sesi obrolan berdasarkan tanggal (Hari Ini, Kemarin, 7 Hari Terakhir, Lebih Lama)", () => {
    const refNow = new Date("2026-11-05T12:00:00.000Z");

    const sampleConversations: AiConversation[] = [
      {
        id: "11111111-1111-4000-8000-000000000001",
        userId: "user-1",
        title: "Obrolan Hari Ini",
        createdAt: "2026-11-05T08:00:00.000Z",
        updatedAt: "2026-11-05T10:00:00.000Z",
      },
      {
        id: "22222222-2222-4000-8000-000000000002",
        userId: "user-1",
        title: "Obrolan Kemarin",
        createdAt: "2026-11-04T15:00:00.000Z",
        updatedAt: "2026-11-04T15:00:00.000Z",
      },
      {
        id: "33333333-3333-4000-8000-000000000003",
        userId: "user-1",
        title: "Obrolan 3 Hari Lalu",
        createdAt: "2026-11-02T10:00:00.000Z",
        updatedAt: "2026-11-02T10:00:00.000Z",
      },
      {
        id: "44444444-4444-4000-8000-000000000004",
        userId: "user-1",
        title: "Obrolan Bulan Lalu",
        createdAt: "2026-10-15T09:00:00.000Z",
        updatedAt: "2026-10-15T09:00:00.000Z",
      },
    ];

    const groups = groupConversationsByDate(sampleConversations, refNow);

    assert.equal(groups.length, 4);
    assert.equal(groups[0]?.label, "Hari Ini");
    assert.equal(groups[0]?.items.length, 1);
    assert.equal(groups[0]?.items[0]?.title, "Obrolan Hari Ini");

    assert.equal(groups[1]?.label, "Kemarin");
    assert.equal(groups[1]?.items.length, 1);
    assert.equal(groups[1]?.items[0]?.title, "Obrolan Kemarin");

    assert.equal(groups[2]?.label, "7 Hari Terakhir");
    assert.equal(groups[2]?.items.length, 1);
    assert.equal(groups[2]?.items[0]?.title, "Obrolan 3 Hari Lalu");

    assert.equal(groups[3]?.label, "Lebih Lama");
    assert.equal(groups[3]?.items.length, 1);
    assert.equal(groups[3]?.items[0]?.title, "Obrolan Bulan Lalu");
  });

  it("memvalidasi skema input ganti nama dan hapus obrolan", () => {
    // Valid rename
    const validRename = renameConversationInputSchema.safeParse({
      conversationId: "11111111-1111-4000-8000-000000000001",
      title: "Judul Baru MikroTik",
    });
    assert.equal(validRename.success, true);

    // Invalid rename (judul kosong)
    const emptyRename = renameConversationInputSchema.safeParse({
      conversationId: "11111111-1111-4000-8000-000000000001",
      title: "   ",
    });
    assert.equal(emptyRename.success, false);

    // Valid delete
    const validDelete = deleteConversationInputSchema.safeParse({
      conversationId: "11111111-1111-4000-8000-000000000001",
    });
    assert.equal(validDelete.success, true);

    // Invalid delete (uuid salah)
    const invalidDelete = deleteConversationInputSchema.safeParse({
      conversationId: "not-a-uuid",
    });
    assert.equal(invalidDelete.success, false);
  });
});
