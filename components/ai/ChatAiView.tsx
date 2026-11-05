"use client";

import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { AiResetCountdown } from "@/components/ai/AiResetCountdown";
import { ChatHistoryDrawer } from "@/components/ai/ChatHistoryDrawer";
import { TypewriterAiText } from "@/components/ai/TypewriterAiText";
import { Button } from "@/components/ui/Button";
import { sendChatAiMessageAction } from "@/lib/actions/ai-actions";
import {
  deleteConversationAction,
  getConversationMessagesAction,
  listConversationsAction,
  renameConversationAction,
} from "@/lib/actions/chat-history-actions";
import { formatScorePercent } from "@/lib/scoring";
import type {
  AiConversation,
  AiQuotaStatus,
  ChatComplexity,
  Role,
} from "@/lib/types";

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
  isNew?: boolean;
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

interface ModeOption {
  key: ChatComplexity;
  label: string;
  description: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    key: "low",
    label: "Rendah",
    description: "Ringkas, cepat, dan hemat",
  },
  {
    key: "medium",
    label: "Menengah",
    description: "Seimbang, standar, dan lengkap",
  },
  {
    key: "high",
    label: "Tinggi",
    description: "Analisis mendalam, detail, dan komprehensif",
  },
];

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

function HistoryIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function generateMessageId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

// Mode Dropdown selector mandiri bergaya Google Gemini
interface ModeDropdownProps {
  complexity: ChatComplexity;
  onSelectComplexity: (mode: ChatComplexity) => void;
  disabled?: boolean;
  dropDirection?: "up" | "down";
  align?: "left" | "right";
  buttonClassName?: string;
}

function ModeDropdown({
  complexity,
  onSelectComplexity,
  disabled = false,
  dropDirection = "up",
  align = "right",
  buttonClassName,
}: ModeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const currentLabel =
    MODE_OPTIONS.find((o) => o.key === complexity)?.label ?? "Rendah";

  const positionClasses =
    dropDirection === "up" ? "bottom-full mb-2" : "top-full mt-2";

  const alignClasses = align === "right" ? "right-0" : "left-0";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={
          buttonClassName ??
          "inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-neutral-100/90 hover:bg-neutral-200/80 px-3 py-1.5 text-xs font-semibold text-foreground transition-all cursor-pointer disabled:opacity-50"
        }
      >
        <span>{currentLabel}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3 w-3 text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Pilih mode kedalaman AI"
          className={`absolute ${positionClasses} ${alignClasses} z-50 w-[270px] sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-surface p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150`}
        >
          {MODE_OPTIONS.map((opt) => {
            const isSelected = opt.key === complexity;
            return (
              <button
                key={opt.key}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelectComplexity(opt.key);
                  setIsOpen(false);
                }}
                className={`w-full flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-surface-selected/60"
                    : "hover:bg-neutral-100/90"
                }`}
              >
                <div className="w-4 pt-0.5 text-accent font-bold shrink-0">
                  {isSelected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 text-accent"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-semibold ${
                      isSelected ? "text-accent" : "text-foreground"
                    }`}
                  >
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-muted leading-relaxed mt-0.5">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CHAT_COMPLEXITY_STORAGE_KEY = "mira_chat_complexity";

function isValidComplexity(val: string | null): val is ChatComplexity {
  return val === "low" || val === "medium" || val === "high";
}

let complexityListeners: Array<() => void> = [];

function emitComplexityChange() {
  for (const listener of complexityListeners) {
    listener();
  }
}

const chatComplexityStore = {
  subscribe(listener: () => void) {
    complexityListeners = [...complexityListeners, listener];
    return () => {
      complexityListeners = complexityListeners.filter((l) => l !== listener);
    };
  },
  getSnapshot(): ChatComplexity {
    if (typeof window === "undefined") {
      return "low";
    }
    try {
      const saved = localStorage.getItem(CHAT_COMPLEXITY_STORAGE_KEY);
      if (isValidComplexity(saved)) {
        return saved;
      }
    } catch {
      // Abaikan jika akses localStorage dibatasi lingkungan browser
    }
    return "low";
  },
  getServerSnapshot(): ChatComplexity {
    return "low";
  },
  setComplexity(newMode: ChatComplexity) {
    try {
      localStorage.setItem(CHAT_COMPLEXITY_STORAGE_KEY, newMode);
    } catch {
      // Abaikan jika akses localStorage dibatasi lingkungan browser
    }
    emitComplexityChange();
  },
};

export function ChatAiView({
  initialQuota,
  userRole,
  userName,
}: ChatAiViewProps) {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [quota, setQuota] = useState<AiQuotaStatus | null>(initialQuota);
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const complexity = useSyncExternalStore(
    chatComplexityStore.subscribe,
    chatComplexityStore.getSnapshot,
    chatComplexityStore.getServerSnapshot,
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function handleComplexityChange(newMode: ChatComplexity) {
    chatComplexityStore.setComplexity(newMode);
  }

  const isParticipant = userRole === "user";
  const isExhausted = isParticipant && Boolean(quota?.isExhausted);

  // Ambil daftar riwayat obrolan & cek query param ?c= pada URL
  useEffect(() => {
    void listConversationsAction().then((res) => {
      if (res.ok) {
        setConversations(res.data);
      }
    });

    const cParam = searchParams.get("c");
    if (cParam) {
      void getConversationMessagesAction(cParam).then((res) => {
        if (res.ok) {
          setActiveConversationId(cParam);
          setMessages(
            res.data.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              createdAt: m.createdAt,
            })),
          );
        }
      });
    }
  }, [searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  async function handleSelectConversation(convId: string) {
    if (convId === activeConversationId) {
      return;
    }
    setActiveConversationId(convId);
    window.history.pushState(null, "", `/chat-ai?c=${convId}`);
    setErrorMessage("");

    const res = await getConversationMessagesAction(convId);
    if (res.ok) {
      setMessages(
        res.data.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
      );
    } else {
      setErrorMessage(res.error);
    }
  }

  function handleNewChat() {
    setActiveConversationId(null);
    setMessages([]);
    setErrorMessage("");
    setInputValue("");
    window.history.pushState(null, "", "/chat-ai");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }

  async function handleRenameConversation(id: string, newTitle: string) {
    const res = await renameConversationAction({
      conversationId: id,
      title: newTitle,
    });
    if (res.ok) {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)),
      );
    }
  }

  async function handleDeleteConversation(id: string) {
    const res = await deleteConversationAction({ conversationId: id });
    if (res.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleNewChat();
      }
    }
  }

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
      // Siapkan riwayat percakapan untuk server (maksimal 6 pesan terakhir, potong aman jika sangat panjang)
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content.slice(0, 15000),
      }));

      const res = await sendChatAiMessageAction({
        message: trimmed,
        history: historyPayload,
        conversationId: activeConversationId ?? undefined,
        complexity,
      });

      if (!res.ok) {
        setErrorMessage(res.error);
        return;
      }

      if (res.data.quota) {
        setQuota(res.data.quota);
      }

      if (res.data.conversationId && !activeConversationId) {
        setActiveConversationId(res.data.conversationId);
        window.history.replaceState(
          null,
          "",
          `/chat-ai?c=${res.data.conversationId}`,
        );

        if (res.data.conversationTitle) {
          const newConv: AiConversation = {
            id: res.data.conversationId,
            userId: "",
            title: res.data.conversationTitle,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setConversations((prev) => [
            newConv,
            ...prev.filter((c) => c.id !== res.data.conversationId),
          ]);
        }
      }

      const assistantMsg: ChatMessage = {
        id: generateMessageId("ai"),
        role: "assistant",
        content: res.data.reply,
        createdAt: new Date().toISOString(),
        isNew: true,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function handleCopyText(id: string, text: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 2000);
  }

  function handleCloseHistory() {
    setIsHistoryOpen(false);
  }

  return (
    <div
      data-chat-view
      className="flex flex-col h-full max-w-4xl w-full mx-auto px-2 sm:px-4 pt-2 pb-2 min-h-0"
    >
      {/* Bar Atas: Tombol Riwayat, Obrolan Baru, & Mode (mobile) */}
      <div className="flex items-center justify-between gap-1 sm:gap-2 pb-2 shrink-0">
        <button
          type="button"
          onClick={() => setIsHistoryOpen(true)}
          className="group flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 sm:px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent/40 hover:bg-neutral-50 transition-all shadow-2xs cursor-pointer shrink-0"
        >
          <HistoryIcon className="h-3.5 w-3.5 text-accent" />
          <span className="hidden sm:inline">Riwayat Obrolan</span>
          <span className="sm:hidden">Riwayat</span>
          {conversations.length > 0 && (
            <span className="rounded-full bg-surface-soft px-1.5 py-0.2 text-[10px] text-muted">
              {conversations.length}
            </span>
          )}
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleNewChat}
              disabled={isPending}
              className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-border bg-surface px-2.5 sm:px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent/40 hover:bg-neutral-50 transition-all shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
            >
              <PlusIcon className="h-3.5 w-3.5 text-accent" />
              <span className="hidden sm:inline">Obrolan Baru</span>
              <span className="sm:hidden">Baru</span>
            </button>
          )}

          {/* Mode Dropdown khusus mobile di bar atas sejajar dengan riwayat & obrolan baru */}
          <div className="sm:hidden shrink-0">
            <ModeDropdown
              complexity={complexity}
              onSelectComplexity={handleComplexityChange}
              disabled={isPending}
              dropDirection="down"
              align="right"
              buttonClassName="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-accent/40 hover:bg-neutral-50 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Popup Riwayat Obrolan */}
      <ChatHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={handleCloseHistory}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => void handleSelectConversation(id)}
        onNewChat={handleNewChat}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Area Pesan Percakapan */}
      <div className="flex-1 overflow-y-auto px-1 sm:px-3 py-4 space-y-4 min-h-0 scrollbar-minimal">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center py-10 px-4 max-w-md mx-auto space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-2xs">
              <SparklesHeaderIcon className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-foreground">
                Halo, {userName || "Peserta MTCNA"}!
              </h2>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Saya adalah MIRA AI, asisten pintar untuk membantu anda memahami materi seputar MikroTik Router dan MTCNA. Silahkan bertanya materi seputar MikroTik Router dan MTCNA!
              </p>
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
                      <TypewriterAiText
                        content={message.content}
                        isNew={message.isNew}
                        onProgress={() => {
                          messagesEndRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest",
                          });
                        }}
                        onComplete={() => {
                          setMessages((prev) =>
                            prev.map((m) =>
                              m.id === message.id ? { ...m, isNew: false } : m,
                            ),
                          );
                        }}
                      />
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
      </div>

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
              Token AI Anda Telah Habis
            </p>
            <p className="text-amber-800">
              Tunggu waktu reset selesai atau minta admin untuk menambah token.
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
      <div className="mt-2 shrink-0 space-y-2">
        {/* Suggestion Chat Horizontal di Bawah */}
        {messages.length === 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-minimal">
            <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-muted pl-1">
              <SparklesHeaderIcon className="h-3 w-3 text-accent" />
              Saran:
            </span>
            {STARTER_PROMPTS.map((item) => (
              <button
                key={item.topic}
                type="button"
                disabled={isPending || isExhausted}
                onClick={() => handleSendMessage(item.prompt)}
                title={item.prompt}
                className="group shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-foreground shadow-2xs hover:border-accent hover:bg-surface-selected transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <span className="font-semibold text-accent group-hover:text-accent-hover">
                  {item.topic}
                </span>
                <span className="text-muted group-hover:text-foreground text-[11px] max-w-[240px] sm:max-w-xs truncate">
                  · {item.prompt}
                </span>
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-2xs focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/20 transition-all"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isExhausted
                ? "Ketik pesan kamu di sini..."
                : "Ketik pesan kamu di sini..."
            }
            disabled={isPending || isExhausted}
            className="flex-1 max-h-32 min-h-[2.5rem] resize-none bg-transparent px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 border-none shadow-none"
            style={{ outline: "none", boxShadow: "none" }}
          />

          {/* Mode Dropdown bergaya Gemini di sebelah kiri tombol kirim (Desktop / Layar >= sm) */}
          <div className="hidden sm:block shrink-0">
            <ModeDropdown
              complexity={complexity}
              onSelectComplexity={handleComplexityChange}
              disabled={isPending}
              dropDirection="up"
              align="right"
              buttonClassName="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-neutral-100/90 hover:bg-neutral-200/80 px-3 py-1.5 text-xs font-semibold text-foreground transition-all cursor-pointer disabled:opacity-50"
            />
          </div>

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
          <div>
            {isParticipant ? (
              quota ? (
                quota.isExhausted ? (
                  <span className="flex items-center gap-1.5 text-amber-900">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Token Habis (0%)</span>{" "}
                    <span className="text-[10px] text-muted tabular-nums">
                      ({quota.tokensUsed.toLocaleString("id-ID")} /{" "}
                      {quota.tokenBudget.toLocaleString("id-ID")} token)
                    </span>
                    {quota.resetAt && (
                      <span className="text-amber-800 font-medium">
                        {/* · Reset: <AiResetCountdown resetAt={quota.resetAt} /> */}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        quota.remainingPercent < 15
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    />
                    <span>
                      Sisa Kuota:{" "}
                      <span className="font-semibold text-foreground">
                        {formatScorePercent(quota.remainingPercent)}%
                      </span>{" "}
                      <span className="text-[10px] text-muted tabular-nums">
                        ({quota.tokensUsed.toLocaleString("id-ID")} /{" "}
                        {quota.tokenBudget.toLocaleString("id-ID")} token)
                      </span>
                    </span>
                  </span>
                )
              ) : (
                <span>Memuat kuota...</span>
              )
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span>Mode Admin (Bebas Kuota)</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted text-right">
              MIRA AI adalah generative AI yang dapat membuat kesalahan.
            </span>
            <span className="tabular-nums shrink-0">{inputValue.length}/1500</span>
          </div>
        </div>
      </div>
    </div>
  );
}
