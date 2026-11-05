"use client";

import { useEffect, useState } from "react";
import {
  groupConversationsByDate,
  type ConversationGroup,
} from "@/lib/ai/chat-history-utils";
import type { AiConversation } from "@/lib/types";

export interface ChatHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: AiConversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
}

export type ChatHistoryModalProps = ChatHistoryDrawerProps;

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

function CloseIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function EditIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
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
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function TrashIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function ChatBubbleIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

export function ChatHistoryDrawer({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
}: ChatHistoryDrawerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Kunci scroll body dan tangani tombol Escape saat popup terbuka
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const groups: ConversationGroup[] = groupConversationsByDate(conversations);

  function startRename(conv: AiConversation, event: React.MouseEvent) {
    event.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  }

  async function handleSaveRename(id: string) {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    setIsSubmitting(true);
    try {
      await onRenameConversation(id, editTitle.trim());
      setEditingId(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string, event: React.MouseEvent) {
    event.stopPropagation();
    const confirmed = window.confirm("Hapus sesi percakapan ini?");
    if (!confirmed) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onDeleteConversation(id);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Popup Riwayat Obrolan MIRA AI"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs transition-opacity animate-in fade-in cursor-pointer"
        aria-hidden="true"
      />

      {/* Modal Popup Box */}
      <div className="relative z-10 flex w-full max-w-lg max-h-[85vh] flex-col rounded-2xl bg-surface shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Popup */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-surface">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <ChatBubbleIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Riwayat Obrolan
              </h2>
              <p className="text-[11px] text-muted">
                {conversations.length > 0
                  ? `${conversations.length} sesi percakapan tersimpan`
                  : "Belum ada sesi percakapan"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup popup riwayat"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-foreground hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Tombol Obrolan Baru */}
        <div className="p-3 sm:px-5 border-b border-border/70 bg-surface">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent text-white px-4 py-2.5 text-xs font-semibold hover:bg-accent-hover transition-colors shadow-2xs cursor-pointer"
          >
            <PlusIcon />
            <span>Obrolan Baru</span>
          </button>
        </div>

        {/* Daftar Sesi Obrolan (Maksimal 5 item tampil langsung, lebih dari 5 muncul scroll) */}
        <div className="max-h-[260px] sm:max-h-[270px] overflow-y-auto p-3 sm:px-5 sm:py-3 space-y-3 scrollbar-minimal">
          {conversations.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted flex flex-col items-center justify-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-surface-soft border border-border flex items-center justify-center text-muted">
                <ChatBubbleIcon className="h-5 w-5" />
              </div>
              <p className="font-medium text-foreground">Belum ada riwayat obrolan</p>
              <p className="max-w-xs text-muted leading-relaxed">
                Mulai tanyakan materi MTCNA untuk menyimpan sesi Anda secara otomatis.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((conv) => {
                    const isActive = conv.id === activeConversationId;
                    const isEditing = conv.id === editingId;

                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          if (!isEditing) {
                            onSelectConversation(conv.id);
                            onClose();
                          }
                        }}
                        className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-colors cursor-pointer ${
                          isActive
                            ? "bg-surface-selected text-accent font-semibold border border-accent/20"
                            : "text-foreground hover:bg-neutral-100 border border-transparent"
                        }`}
                      >
                        {isEditing ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              void handleSaveRename(conv.id);
                            }}
                            className="flex-1 flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              autoFocus
                              maxLength={80}
                              disabled={isSubmitting}
                              className="flex-1 rounded-md border border-accent bg-surface px-2 py-1 text-xs text-foreground focus:outline-hidden"
                            />
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="text-[10px] font-semibold text-accent hover:underline shrink-0"
                            >
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-[10px] text-muted hover:underline shrink-0"
                            >
                              Batal
                            </button>
                          </form>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1 pr-2 flex items-center gap-2">
                              <ChatBubbleIcon
                                className={`h-3.5 w-3.5 shrink-0 ${
                                  isActive ? "text-accent" : "text-muted"
                                }`}
                              />
                              <p className="truncate">{conv.title}</p>
                            </div>

                            {/* Tombol Aksi (Rename & Hapus) */}
                            <div className="shrink-0 flex items-center gap-1 opacity-80 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={(e) => startRename(conv, e)}
                                title="Ubah judul"
                                className="p-1 text-muted hover:text-accent rounded transition-colors"
                              >
                                <EditIcon />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => void handleDelete(conv.id, e)}
                                title="Hapus obrolan"
                                className="p-1 text-muted hover:text-red-600 rounded transition-colors"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export { ChatHistoryDrawer as ChatHistoryModal };
