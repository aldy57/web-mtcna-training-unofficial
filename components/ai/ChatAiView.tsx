"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AiResetCountdown } from "@/components/ai/AiResetCountdown";
import { FormattedAiText } from "@/components/ai/FormattedAiText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { sendChatAiMessageAction } from "@/lib/actions/ai-actions";
import { formatScorePercent } from "@/lib/scoring";
import type { AiQuotaStatus, Role } from "@/lib/types";

export interface ChatAiViewProps {
  initialQuota: AiQuotaStatus | null;
  userRole: Role;
  userName: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

const STARTER_PROMPTS = [
  {
    topic: "Firewall & NAT",
    prompt: "Bagaimana cara konfigurasi NAT Masquerade dan port forwarding (dstnat) di MikroTik RouterOS?",
  },
  {
    topic: "Static Routing",
    prompt: "Apa perbedaan default route dengan check-gateway=ping vs arp pada RouterOS?",
  },
  {
    topic: "QoS & Bandwidth",
    prompt: "Bagaimana cara membuat Simple Queue untuk membatasi kecepatan download/upload per IP peserta?",
  },
  {
    topic: "Bridging & VLAN",
    prompt: "Jelaskan konsep dasar Bridge VLAN Filtering pada RouterOS v7 dan contoh konfigurasinya!",
  },
  {
    topic: "Subnetting IPv4",
    prompt: "Bantu saya menghitung netmask, network address, dan broadcast address untuk IP 192.168.10.75/27!",
  },
] as const;

function CopyIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SendIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function SparklesHeaderIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}

function generateMessageId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ChatAiView({
  initialQuota,
  userRole,
  userName,
}: ChatAiViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [quota, setQuota] = useState<AiQuotaStatus | null>(initialQuota);
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isParticipant = userRole === "user";
  const isExhausted = isParticipant && Boolean(quota?.isExhausted);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  function handleSendMessage(textToSend?: string) {
    const rawText = textToSend ?? inputValue;
    const trimmed = rawText.trim();
    if (!trimmed || isPending || isExhausted) {
      return;
    }

    setErrorMessage("");
    const userMsg: ChatMessage = {
      id: generateMessageId("user"),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputValue("");

    startTransition(async () => {
      // Siapkan riwayat percakapan untuk server
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendChatAiMessageAction({
        message: trimmed,
        history: historyPayload,
      });

      if (!res.ok) {
        setErrorMessage(res.error);
        return;
      }

      const assistantMsg: ChatMessage = {
        id: generateMessageId("ai"),
        role: "assistant",
        content: res.data.reply,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (res.data.quota) {
        setQuota(res.data.quota);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function handleResetChat() {
    setMessages([]);
    setErrorMessage("");
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }

  function handleCopyText(id: string, text: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 2000);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-4xl mx-auto">
      {/* Header Panel Chat */}
      <Card className="shrink-0 mb-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <SparklesHeaderIcon />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-semibold text-foreground">
                  MIRA AI
                </h1>
              </div>
              <p className="text-xs text-muted">
                Asisten tutor cerdas materi sertifikasi MTCNA, konsep jaringan, &amp; sintaks CLI RouterOS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isParticipant ? (
              quota ? (
                <Badge
                  variant={
                    quota.isExhausted
                      ? "caution"
                      : quota.remainingPercent < 15
                        ? "caution"
                        : "success"
                  }
                >
                  {quota.isExhausted ? (
                    <span className="flex items-center gap-1">
                      <span>Kuota Habis</span>
                      {quota.resetAt && (
                        <span>
                          · <AiResetCountdown resetAt={quota.resetAt} />
                        </span>
                      )}
                    </span>
                  ) : (
                    `Sisa Kuota: ${formatScorePercent(quota.remainingPercent)}%`
                  )}
                </Badge>
              ) : null
            ) : (
              <Badge variant="neutral">Mode Admin (Bebas Kuota)</Badge>
            )}

            {messages.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleResetChat}
                disabled={isPending}
              >
                Sesi Baru
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Area Pesan Percakapan */}
      <Card className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-surface">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center py-8 px-2 max-w-lg mx-auto space-y-5">
            <div className="h-12 w-12 rounded-2xl bg-surface-soft border border-border flex items-center justify-center text-accent">
              <SparklesHeaderIcon className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                Halo, {userName || "Peserta MTCNA"}!
              </h2>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Saya adalah MIRA AI, asisten tutor cerdas untuk materi MikroTik MTCNA. Anda dapat menanyakan konsep teori jaringan, bedah perintah CLI, atau troubleshooting konfigurasi RouterOS.
              </p>
            </div>

            {/* Starter Suggestion Chips */}
            <div className="w-full space-y-2 pt-2 text-left">
              <p className="text-xs font-semibold text-muted text-center">
                Pilih topik pembuka atau ketik pertanyaan Anda sendiri di bawah:
              </p>
              <div className="flex flex-col gap-1.5">
                {STARTER_PROMPTS.map((item) => (
                  <button
                    key={item.topic}
                    type="button"
                    disabled={isPending || isExhausted}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="group flex items-start gap-2.5 rounded-xl border border-border bg-surface-soft px-3.5 py-2.5 text-xs text-foreground hover:border-accent hover:bg-surface-selected transition-all cursor-pointer text-left disabled:opacity-50"
                  >
                    <span className="shrink-0 font-semibold text-accent group-hover:text-accent-hover">
                      [{item.topic}]
                    </span>
                    <span className="line-clamp-2 text-muted group-hover:text-foreground">
                      {item.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? "bg-accent text-white rounded-br-xs"
                        : "bg-surface-soft border border-border text-foreground rounded-bl-xs"
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-border/60">
                        <span className="text-[11px] font-semibold text-accent flex items-center gap-1">
                          <SparklesHeaderIcon className="h-3 w-3" />
                          MIRA AI
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(message.id, message.content)}
                          title="Salin isi pesan"
                          className="text-muted hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
                        >
                          {copiedId === message.id ? (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                              <CheckIcon /> Tersalin
                            </span>
                          ) : (
                            <CopyIcon />
                          )}
                        </button>
                      </div>
                    )}

                    {isUser ? (
                      <div className="whitespace-pre-line break-words font-sans">
                        {message.content}
                      </div>
                    ) : (
                      <FormattedAiText content={message.content} />
                    )}

                    <div
                      className={`text-[10px] mt-1.5 text-right ${
                        isUser ? "text-white/70" : "text-muted"
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {isPending && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-xs bg-surface-soft border border-border px-4 py-3 text-xs text-muted flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="h-2 w-2 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="h-2 w-2 bg-accent rounded-full animate-bounce" />
                  </div>
                  <span>MIRA AI sedang menyusun jawaban...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </Card>

      {/* Pesan Kesalahan / Kuota Habis */}
      {errorMessage && (
        <div
          role="alert"
          className="mt-2 rounded-xl border border-red-200 bg-danger-bg px-3.5 py-2 text-xs text-danger-ink"
        >
          {errorMessage}
        </div>
      )}

      {isExhausted && (
        <div
          role="alert"
          className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        >
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-900">
              Kuota Bantuan AI Anda Telah Habis (0%)
            </p>
            <p className="text-amber-800">
              Sistem menerapkan batas waktu reset otomatis 1 hari (24 jam) sejak kuota habis.
            </p>
          </div>
          {quota?.resetAt && (
            <div className="shrink-0 flex items-center gap-1.5 rounded-lg bg-amber-100 border border-amber-300 px-3 py-1.5 font-mono text-xs font-bold text-amber-950">
              <span className="text-[11px] font-sans font-medium text-amber-800">
                Reset dalam:
              </span>
              <AiResetCountdown resetAt={quota.resetAt} className="text-amber-950 font-bold" />
            </div>
          )}
        </div>
      )}

      {/* Input Form Bar */}
      <div className="mt-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-2xs focus-within:border-accent transition-colors"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isExhausted
                ? "Kuota AI Anda saat ini habis..."
                : "Tanyakan materi MTCNA atau perintah RouterOS (Enter untuk kirim)..."
            }
            disabled={isPending || isExhausted}
            className="flex-1 max-h-32 min-h-[2.5rem] resize-none bg-transparent px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted focus:outline-none"
          />

          <Button
            type="submit"
            size="sm"
            variant="primary"
            disabled={!inputValue.trim() || isPending || isExhausted}
            className="shrink-0 rounded-xl px-3.5 py-2"
          >
            {isPending ? (
              <span className="flex items-center gap-1.5 text-xs">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Kirim</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs">
                <span>Kirim</span>
                <SendIcon />
              </span>
            )}
          </Button>
        </form>

        <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-muted">
          <span>Tekan <strong>Enter</strong> untuk mengirim, <strong>Shift + Enter</strong> untuk baris baru.</span>
          <span>{inputValue.length}/1500</span>
        </div>
      </div>
    </div>
  );
}
