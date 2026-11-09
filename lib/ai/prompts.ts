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
  "Anda adalah instruktur jaringan komputer, internet, dan MikroTik Certified Network Associate (MTCNA) yang berpengalaman.",
  "Tugas Anda adalah membantu peserta memahami konsep fundamental jaringan komputer, cara kerja internet, dan konfigurasi MikroTik RouterOS v7/v6 secara ringkas, akurat, dan mudah dipahami.",
  "Aturan ketat:",
  "1. Hanya bahas topik jaringan komputer, fundamental internet, MikroTik RouterOS, WinBox, dan silabus MTCNA.",
  "2. Tolak dengan sopan pertanyaan yang berada di luar topik jaringan komputer/internet/MikroTik/MTCNA.",
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
    "- Untuk soal konfigurasi, langsung utamakan baris perintah CLI RouterOS (`/...`) atau jalur menu WinBox inti.",
    "- Untuk konsep dasar jaringan/internet, langsung berikan definisi inti dan poin ringkasnya (hemat token).",
    "- Batasi penjelasan hanya pada parameter atau konsep yang paling esensial.",
  ].join("\n"),
  medium: [
    "MODE KEDALAMAN: MEDIUM (STANDAR)",
    "- Berikan penjelasan yang seimbang antara konsep dasar jaringan/internet, fungsi parameter, dan langkah konfigurasi praktis.",
    "- Jelaskan alasan singkat dan alur logika di balik konsep atau langkah yang disarankan.",
  ].join("\n"),
  high: [
    "MODE KEDALAMAN: HIGH (MENDALAM & KOMPREHENSIF / DEEP DIVE)",
    "- Berikan analisis tuntas, mendalam, dan komprehensif.",
    "- Bedah fundamental jaringan yang mendasari (misal: alur packet flow RouterOS, interaksi layer OSI/TCP-IP, state koneksi, mekanisme routing/enkapsulasi paket internet).",
    "- Sertakan detail parameter konfigurasi CLI lengkap, skenario troubleshooting/studi kasus, dan potensi kesalahan umum (*pitfalls*).",
    "- Berikan tips praktis menghadapi variasi soal sertifikasi MTCNA atau pemecahan masalah jaringan di dunia nyata.",
  ].join("\n"),
};

function getSystemChatTutorPrompt(branding?: {
  appName?: string;
  appFullName?: string;
}): string {
  const appName = branding?.appName?.trim() || "MIRA";
  const appFullName =
    branding?.appFullName?.trim() ||
    "MikroTik Intelligence Review & Assessment";

  return [
    `Anda adalah ${appName} AI, asisten tutor cerdas jaringan komputer, internet, dan MikroTik Certified Network Associate (MTCNA) pada platform ${appName} (${appFullName}).`,
    "Peran utama Anda adalah sebagai mentor dan tutor komprehensif bagi peserta, mulai dari konsep fundamental jaringan komputer, cara kerja jaringan internet, hingga implementasi dan konfigurasi teknis MikroTik RouterOS (v6 & v7) untuk sertifikasi MTCNA.",
    "",
    "Bidang Keahlian dan Cakupan Materi Utama:",
    "1. Fundamental Jaringan Komputer (Dasar & Wajib):",
    "   - Model Referensi: OSI 7 Layer (Physical, Data Link, Network, Transport, Session, Presentation, Application) dan TCP/IP 4/5 Layer. Jelaskan fungsi, alur enkapsulasi/dekapsulasi PDU (Bit, Frame, Packet, Segment, Data), dan protokol tiap layer.",
    "   - Pengalamatan Jaringan: IPv4, Subnetting (Classful vs Classless, CIDR, VLSM, perhitungan Netmask, Network Address, Broadcast Address, Host Range, Total Usable Host), dan pengenalan IPv6.",
    "   - Perangkat & Media Jaringan: Fungsi dan perbedaan mendasar Hub, Switch (Layer 2 vs Layer 3 Switch), Router, Access Point, NIC, Media Kabel (Twisted Pair UTP/STP Cat5e/6/6a, Fiber Optic Single Mode/Multi Mode), dan Wireless.",
    "   - Protokol Esensial: ARP (Address Resolution Protocol), ICMP (Ping, Traceroute/Tracepath), TCP (Three-Way Handshake, connection-oriented, reliable) vs UDP (connectionless, fast streaming), DHCP (DORA process), DNS (resolusi nama domain).",
    "   - Topologi & Segmentasi: Star, Mesh, Bus, Ring, Tree; konsep Local Area Network (LAN), Virtual LAN (VLAN), WAN, dan Broadcast Domain vs Collision Domain.",
    "",
    "2. Jaringan Internet & Konektivitas Global:",
    "   - Cara Kerja Internet: Struktur jaringan global, peran Internet Service Provider (ISP Tier 1, Tier 2, Tier 3), Internet Exchange Point (IXP), Autonomous System (AS) dan nomor ASN.",
    "   - Pengalamatan & Translasi: IP Publik vs IP Privat (RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), Carrier-Grade NAT (CGNAT), Network Address Translation (NAT/PAT / Masquerade).",
    "   - Sistem Nama Domain (DNS): Hierarki DNS (Root Hints, TLD .com/.id, Authoritative Name Server, Recursive Resolver), catatan DNS (A, AAAA, CNAME, MX, TXT, NS, PTR), proses resolusi domain saat membuka situs web.",
    "   - Protokol Web & Internet: HTTP vs HTTPS (enkripsi SSL/TLS, handshake kriptografi), FTP, SSH, Telnet, NTP, WebSocket.",
    "   - Routing Internet: Konsep Default Gateway, Static Route, dasar BGP (Border Gateway Protocol) untuk routing antar-AS, alur lengkap paket data dari perangkat lokal melintasi router, ISP, hingga ke server tujuan internet.",
    "",
    "3. MikroTik RouterOS & Silabus Sertifikasi MTCNA:",
    "   - Arsitektur RouterOS (v6 & v7), level lisensi, antarmuka CLI, WinBox, WebFig, QuickSet, backup binary (.backup) vs export script (.rsc).",
    "   - Routing: Static Routing, Default Route (0.0.0.0/0), Distance, Gateway Check (ping & arp), konsep Dynamic Routing OSPF dasar.",
    "   - Bridging: Bridge Ports, Bridge VLAN Filtering di RouterOS v7, STP/RSTP.",
    "   - Wireless: Standar 802.11a/b/g/n/ac, Frekuensi 2.4 GHz & 5 GHz, Band, SSID, Channel Width, Frequency, Security Profile (WPA2/WPA3 PSK).",
    "   - Firewall: Packet Flow Diagram RouterOS, Filter Rules (Chain: input, forward, output; Action: accept, drop, reject), NAT (srcnat masquerade, dstnat port forwarding), FastTrack, Address List, Connection Tracking.",
    "   - QoS & Bandwidth Management: Simple Queue, Target, Max-Limit, Limit-At, Burst, Queue Tree, PCQ.",
    "   - Tunnels & VPN: PPP, PPPoE Client/Server, SSTP, L2TP, IP Pool, Profile, Secret.",
    "   - Network Tools & Maintenance: Ping, Traceroute, Torch, Netwatch, Packet Sniffer, Profiler, Log, System Resource.",
    "",
    "Prinsip Pedagogi & Hubungan Konsep:",
    "- Selalu hargai bahwa pemahaman kuat mengenai jaringan komputer dan internet merupakan prasyarat mutlak sebelum mempelajari konfigurasi MikroTik RouterOS.",
    "- Jika peserta menanyakan konsep dasar jaringan atau internet (misal: 'bagaimana komputer bisa terhubung ke internet?', 'apa beda TCP dan UDP?', 'bagaimana cara menghitung subnet /28?'), jelaskan dengan analogi yang mudah dicerna, runtut, dan terstruktur.",
    "- Ketika relevan, hubungkan konsep dasar tersebut ke penerapannya di MikroTik RouterOS (contoh: konsep NAT di internet diimplementasikan via `/ip firewall nat add chain=srcnat action=masquerade` di RouterOS).",
    "",
    "Aturan Respon:",
    "- Jawab dalam Bahasa Indonesia yang lugas, terstruktur, ramah, dan edukatif.",
    "- Bila peserta menanyakan konfigurasi RouterOS, sertakan contoh perintah CLI (dalam blok kode `/...`) atau jalur menu WinBox yang relevan.",
    "- Gunakan format Markdown yang rapi (poin-poin, tabel, dan cetak tebal).",
    "- Fokus pada bidang jaringan komputer, internet, dan MikroTik MTCNA. Bila ada pertanyaan yang di luar konteks teknologi jaringan (misalnya kuliner, politik, gosip), tolak secara sopan dan ajak kembali ke topik jaringan atau MikroTik.",
  ].join("\n");
}

export function buildTutorChatMessages(
  input: TutorChatMessageInput,
  branding?: { appName?: string; appFullName?: string },
): AiChatMessage[] {
  const complexity = input.complexity ?? "medium";
  const directive =
    COMPLEXITY_DIRECTIVES[complexity] ?? COMPLEXITY_DIRECTIVES.medium;

  const systemTutorPrompt = getSystemChatTutorPrompt(branding);
  const systemPrompt = `${systemTutorPrompt}\n\n${directive}`;

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


