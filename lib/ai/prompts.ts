import type { AiChatMessage } from "@/lib/ai/client";
import { OPTION_KEYS } from "@/lib/constants";
import { TOPICS } from "@/lib/topics";
import type {
  ChatComplexity,
  Language,
  OptionKey,
  QuestionWithSolution,
  QuizResultSummary,
} from "@/lib/types";

const SYSTEM_TUTOR_PROMPT = [
  "Anda adalah instruktur MikroTik Certified Network Associate (MTCNA) yang berpengalaman.",
  "Tugas Anda adalah membantu peserta memahami konsep jaringan dan konfigurasi MikroTik RouterOS v7/v6 secara ringkas, akurat, dan mudah dipahami.",
  "Aturan ketat:",
  "1. Hanya bahas topik jaringan komputer, MikroTik RouterOS, WinBox, dan silabus MTCNA.",
  "2. Tolak dengan sopan pertanyaan yang berada di luar topik jaringan/MikroTik/MTCNA.",
  "3. Gunakan teks biasa yang rapi (poin-poin singkat dan contoh perintah CLI RouterOS bila relevan). Jangan gunakan tag HTML.",
  "4. Buat jawaban padat dan langsung ke inti konsep (maksimal sekitar 160 kata) agar mudah dipelajari.",
].join("\n");

function formatQuestionContext(question: QuestionWithSolution): string {
  const optionsText = OPTION_KEYS.map(
    (key) => `${key}. ${question.options[key]}`,
  ).join("\n");

  return [
    `ID Soal: ${question.id} (${TOPICS[question.topic]})`,
    `Jenis: ${question.kind === "jamak" ? "Pilihan Jamak" : "Pilihan Tunggal"}`,
    `Pertanyaan: ${question.body}`,
    `Opsi:\n${optionsText}`,
    `Kunci Jawaban Benar: ${question.answerKey}`,
    `Pembahasan Dasar: ${question.explanation}`,
  ].join("\n");
}

export function buildGeneralExplanationMessages(
  question: QuestionWithSolution,
  language: Language,
): AiChatMessage[] {
  const langInstruction =
    language === "en"
      ? "Jawab dalam bahasa Inggris yang jelas (sesuai bahasa soal ujian MTCNA), dengan istilah teknis RouterOS yang tepat."
      : "Jawab dalam bahasa Indonesia yang jelas, dengan tetap menyertakan istilah/perintah teknis RouterOS yang tepat.";

  const userPrompt = [
    formatQuestionContext(question),
    "",
    "Berikan penjelasan mendalam yang mencakup:",
    "1. Alasan teknis mengapa kunci jawaban tersebut benar.",
    "2. Mengapa opsi pengecoh lainnya kurang tepat.",
    "3. Contoh singkat perintah CLI RouterOS atau menu WinBox yang relevan.",
    langInstruction,
  ].join("\n");

  return [
    { role: "system", content: SYSTEM_TUTOR_PROMPT },
    { role: "user", content: userPrompt },
  ];
}

export function buildPersonalExplanationMessages(
  question: QuestionWithSolution,
  selectedOptions: readonly OptionKey[],
  language: Language,
): AiChatMessage[] {
  const selectedLabel =
    selectedOptions.length > 0
      ? selectedOptions
          .map((key) => `${key} (${question.options[key]})`)
          .join(", ")
      : "Kosong / Belum dijawab";

  const langInstruction =
    language === "en"
      ? "Berikan penjelasan dalam bahasa Indonesia dengan mengutip istilah soal bahasa Inggris bila perlu."
      : "Berikan penjelasan dalam bahasa Indonesia.";

  const userPrompt = [
    formatQuestionContext(question),
    `Jawaban Peserta: ${selectedLabel}`,
    "",
    "Analisis secara spesifik:",
    "1. Letak kekeliruan atau kekurangan pada pilihan peserta (atau konfirmasi konsep jika jawaban peserta sudah benar).",
    "2. Langkah berpikir dan konsep RouterOS yang tepat untuk menjawab soal ini.",
    langInstruction,
  ].join("\n");

  return [
    { role: "system", content: SYSTEM_TUTOR_PROMPT },
    { role: "user", content: userPrompt },
  ];
}

export function buildAskAiMessages(
  question: QuestionWithSolution,
  participantQuestion: string,
): AiChatMessage[] {
  const userPrompt = [
    "Konteks Soal yang Sedang Dibahas:",
    formatQuestionContext(question),
    "",
    `Pertanyaan Peserta: "${participantQuestion.trim()}"`,
    "",
    "Jawab pertanyaan peserta dalam bahasa Indonesia secara ringkas dan akurat berdasarkan konteks soal MTCNA/RouterOS di atas. Jika pertanyaan tidak berkaitan dengan jaringan komputer, MikroTik RouterOS, atau MTCNA, tolak dengan sopan.",
  ].join("\n");

  return [
    { role: "system", content: SYSTEM_TUTOR_PROMPT },
    { role: "user", content: userPrompt },
  ];
}

export function buildRecommendationMessages(
  summary: QuizResultSummary,
): AiChatMessage[] {
  const topicLines = summary.topicBreakdown
    .map(
      (row) =>
        `- ${row.topicLabel}: ${row.correctCount}/${row.totalCount} (${row.scorePercent}%)`,
    )
    .join("\n");

  const weakestLines =
    summary.weakestTopics.length > 0
      ? summary.weakestTopics
          .map((row) => `${row.topicLabel} (${row.scorePercent}%)`)
          .join(", ")
      : "Tidak ada topik di bawah ambang kelulusan";

  const userPrompt = [
    `Hasil Tryout MTCNA (${summary.totalQuestions} soal):`,
    `- Skor Akhir: ${summary.scorePercent}% (${summary.hasPassed ? "Lulus Latihan" : "Belum Lulus"})`,
    `- Benar: ${summary.correctCount}, Salah: ${summary.wrongCount}, Kosong: ${summary.blankCount}`,
    `- Topik Terlemah: ${weakestLines}`,
    "Rincian Skor per Topik:",
    topicLines,
    "",
    "Susun rekomendasi belajar singkat dalam bahasa Indonesia yang berisi:",
    "1. Evaluasi singkat performa peserta.",
    "2. 3 prioritas materi/praktik RouterOS yang wajib dipelajari ulang berdasarkan topik terlemah.",
    "3. Saran latihan praktis di WinBox/CLI sebelum mencoba tryout berikutnya.",
  ].join("\n");

  return [
    { role: "system", content: SYSTEM_TUTOR_PROMPT },
    { role: "user", content: userPrompt },
  ];
}

export interface TutorChatMessageInput {
  history: readonly { role: "user" | "assistant"; content: string }[];
  userMessage: string;
  complexity?: ChatComplexity;
}

const COMPLEXITY_DIRECTIVES: Record<ChatComplexity, string> = {
  low: [
    "MODE KEDALAMAN: LOW (RINGKAS & PADAT / QUICK FIX)",
    "- Berikan jawaban yang SANGAT SINGKAT, PADAT, dan LANGSUNG KE INTI SOLUSI.",
    "- Jangan berikan pengantar panjang atau pendahuluan teori yang bertele-tele.",
    "- Langsung utamakan baris perintah CLI RouterOS (`/...`) atau jalur menu WinBox inti.",
    "- Batasi penjelasan hanya pada parameter yang paling esensial (hemat token).",
  ].join("\n"),
  medium: [
    "MODE KEDALAMAN: MEDIUM (STANDAR)",
    "- Berikan penjelasan yang seimbang antara konsep dasar, fungsi parameter, dan langkah konfigurasi praktis.",
    "- Jelaskan alasan singkat di balik langkah yang disarankan.",
  ].join("\n"),
  high: [
    "MODE KEDALAMAN: HIGH (MENDALAM & KOMPREHENSIF / DEEP DIVE)",
    "- Berikan analisis tuntas, mendalam, dan komprehensif.",
    "- Bedah fundamental jaringan yang mendasari (misal: alur packet flow RouterOS, interaksi layer OSI/TCP-IP, state koneksi).",
    "- Sertakan detail parameter konfigurasi CLI lengkap, skenario troubleshooting/studi kasus, dan potensi kesalahan umum (*pitfalls*).",
    "- Berikan tips praktis menghadapi variasi soal ujian sertifikasi MTCNA terkait topik ini.",
  ].join("\n"),
};

const SYSTEM_CHAT_TUTOR_PROMPT = [
  "Anda adalah MIRA AI, asisten tutor cerdas MikroTik Certified Network Associate (MTCNA) pada platform MIRA (MikroTik Intelligence Review & Assessment).",
  "Tugas utama Anda adalah membantu peserta mempelajari dan memahami materi silabus sertifikasi MTCNA serta konfigurasi MikroTik RouterOS (v6 & v7) dan WinBox.",
  "",
  "Cakupan Topik Utama MTCNA:",
  "1. Dasar Jaringan, Subnetting IPv4/IPv6, CIDR, VLSM, Default Gateway.",
  "2. Arsitektur RouterOS, Manajemen Konfigurasi (Backup binary vs Export rsc).",
  "3. Routing: Static Route, Default Route, Gateway Check, Distance, Konsep OSPF.",
  "4. Bridging: Konsep Bridge Port, Bridge VLAN Filtering di v7, RSTP.",
  "5. Wireless: Standar 802.11a/b/g/n/ac, Frekuensi, SSID, Security Profile.",
  "6. Firewall: Filter Rules (Input, Forward, Output), NAT (Srcnat Masquerade, Dstnat Port Forwarding), FastTrack.",
  "7. QoS: Simple Queue, Target, Max-Limit, Burst, PCQ.",
  "8. Tunnels: PPP, PPPoE Client/Server, SSTP, L2TP, IP Pool.",
  "9. Tools: Ping, Traceroute, Torch, Netwatch, RouterOS CLI.",
  "",
  "Aturan Respon:",
  "- Jawab dalam Bahasa Indonesia yang lugas, terstruktur, dan edukatif.",
  "- Sertakan contoh perintah CLI RouterOS (dalam blok kode `/...`) atau navigasi menu WinBox bila relevan.",
  "- Gunakan format Markdown yang rapi (poin-poin dan cetak tebal).",
  "- Fokus eksklusif pada jaringan komputer, MikroTik, dan MTCNA. Bila ada pertanyaan di luar topik, tolak secara sopan dan ajak kembali ke materi MTCNA.",
].join("\n");

export function buildTutorChatMessages(
  input: TutorChatMessageInput,
): AiChatMessage[] {
  const complexity = input.complexity ?? "medium";
  const directive =
    COMPLEXITY_DIRECTIVES[complexity] ?? COMPLEXITY_DIRECTIVES.medium;

  const systemPrompt = `${SYSTEM_CHAT_TUTOR_PROMPT}\n\n${directive}`;

  const messages: AiChatMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  // Batasi riwayat maksimal 6 pesan terakhir untuk efisiensi token
  const recentHistory = input.history.slice(-6);
  for (const item of recentHistory) {
    messages.push({
      role: item.role,
      content: item.content,
    });
  }

  messages.push({
    role: "user",
    content: input.userMessage.trim(),
  });

  return messages;
}


