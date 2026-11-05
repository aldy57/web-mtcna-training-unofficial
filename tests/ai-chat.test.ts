import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chatAiInputSchema } from "@/lib/ai/ai-config";
import { buildTutorChatMessages } from "@/lib/ai/prompts";

describe("lib/ai — MIRA AI (Tutor Cerdas)", () => {
  it("memvalidasi skema input pesan chat dengan zod", () => {
    // Valid input
    const valid = chatAiInputSchema.safeParse({
      message: "Bagaimana cara konfigurasi NAT Masquerade?",
      history: [
        { role: "user", content: "Halo tutor" },
        { role: "assistant", content: "Halo! Ada yang bisa saya bantu?" },
      ],
    });
    assert.equal(valid.success, true);

    // Pesan singkat minimal 1 karakter valid
    const shortValid = chatAiInputSchema.safeParse({
      message: "hi",
    });
    assert.equal(shortValid.success, true);

    // Pesan kosong ditolak
    const emptyMsg = chatAiInputSchema.safeParse({
      message: "   ",
    });
    assert.equal(emptyMsg.success, false);

    // Default history kosong bila tidak disertakan
    const defaultHistory = chatAiInputSchema.safeParse({
      message: "Jelaskan tentang default gateway!",
    });
    assert.equal(defaultHistory.success, true);
    if (defaultHistory.success) {
      assert.deepEqual(defaultHistory.data.history, []);
    }
  });

  it("membangun prompt instruktur MTCNA dan membatasi riwayat ke 6 pesan terakhir", () => {
    const longHistory = [
      { role: "user" as const, content: "Pesan 1" },
      { role: "assistant" as const, content: "Balasan 1" },
      { role: "user" as const, content: "Pesan 2" },
      { role: "assistant" as const, content: "Balasan 2" },
      { role: "user" as const, content: "Pesan 3" },
      { role: "assistant" as const, content: "Balasan 3" },
      { role: "user" as const, content: "Pesan 4" },
      { role: "assistant" as const, content: "Balasan 4" },
    ];

    const messages = buildTutorChatMessages({
      history: longHistory,
      userMessage: "Pertanyaan terbaru tentang OSPF",
    });

    // 1 pesan system + maksimal 6 riwayat + 1 pesan user baru = 8 pesan
    assert.equal(messages.length, 8);
    assert.equal(messages[0]?.role, "system");
    assert.ok(messages[0]?.content.includes("MTCNA"));
    assert.equal(messages[messages.length - 1]?.role, "user");
    assert.equal(
      messages[messages.length - 1]?.content,
      "Pertanyaan terbaru tentang OSPF",
    );

    // Pesan pertama riwayat adalah Pesan 2 (karena Pesan 1 & Balasan 1 terpotong)
    assert.equal(messages[1]?.content, "Pesan 2");
  });
});
