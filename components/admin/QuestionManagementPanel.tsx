"use client";

import { useActionState, useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { ConfirmDialog, StatusPopup } from "@/components/ui/PopupModal";
import {
  deleteQuestionAction,
  upsertQuestionAction,
  type AdminFormState,
} from "@/lib/actions/admin-actions";
import { OPTION_KEYS } from "@/lib/constants";
import { TOPICS, TOPIC_KEYS } from "@/lib/topics";
import type { QuestionRecord, TopicKey } from "@/lib/types";

export function QuestionManagementPanel({
  questions,
}: {
  questions: readonly QuestionRecord[];
}) {
  const [selectedTopic, setSelectedTopic] = useState<TopicKey | "ALL">("ALL");
  const [editingQuestion, setEditingQuestion] = useState<QuestionRecord | null>(
    null,
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTargetQuestion, setDeleteTargetQuestion] =
    useState<QuestionRecord | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [formState, formAction, isSaving] = useActionState<
    AdminFormState,
    FormData
  >(upsertQuestionAction, null);
  const [dismissedFormState, setDismissedFormState] =
    useState<AdminFormState>(null);

  const isFormPopupOpen = Boolean(
    formState && formState !== dismissedFormState,
  );

  const filteredQuestions =
    selectedTopic === "ALL"
      ? questions
      : questions.filter((q) => q.topic === selectedTopic);

  function handleOpenCreate() {
    setEditingQuestion(null);
    setIsFormOpen(true);
  }

  function handleOpenEdit(question: QuestionRecord) {
    setEditingQuestion(question);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleConfirmDeleteQuestion() {
    if (!deleteTargetQuestion) {
      return;
    }
    const formData = new FormData();
    formData.set("questionId", deleteTargetQuestion.id);
    startDeleteTransition(async () => {
      const res = await deleteQuestionAction(formData);
      setDeleteTargetQuestion(null);
      setDeleteFeedback({
        ok: res.ok,
        message: res.ok ? res.data : res.error,
      });
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedTopic("ALL")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
              selectedTopic === "ALL"
                ? "bg-accent text-white"
                : "bg-surface-soft text-muted hover:text-foreground"
            }`}
          >
            Semua Topik ({questions.length})
          </button>
          {TOPIC_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedTopic(key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
                selectedTopic === key
                  ? "bg-accent text-white"
                  : "bg-surface-soft text-muted hover:text-foreground"
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => (isFormOpen ? setIsFormOpen(false) : handleOpenCreate())}
        >
          {isFormOpen ? "Tutup Form Soal" : "+ Tambah / Edit Soal"}
        </Button>
      </div>

      {formState && (
        <Notice variant={formState.ok ? "success" : "danger"}>
          <p>{formState.ok ? formState.data : formState.error}</p>
        </Notice>
      )}

      {deleteFeedback && (
        <Notice variant={deleteFeedback.ok ? "success" : "danger"}>
          <p>{deleteFeedback.message}</p>
        </Notice>
      )}

      {isFormOpen && (
        <Card
          key={editingQuestion?.id ?? "new-question"}
          className="space-y-5 border-accent"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">
              {editingQuestion
                ? `Edit Soal ${editingQuestion.id}`
                : "Tambah Soal Baru (Dwibahasa ID & EN)"}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFormOpen(false)}
            >
              Tutup
            </Button>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold">
                  ID Soal (A01–B25)
                </label>
                <input
                  name="id"
                  type="text"
                  required
                  defaultValue={editingQuestion?.id ?? ""}
                  placeholder="Contoh: A26"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold">Topik</label>
                <select
                  name="topic"
                  defaultValue={editingQuestion?.topic ?? "Dasar"}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                >
                  {TOPIC_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {TOPICS[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold">
                  Jenis Soal
                </label>
                <select
                  name="kind"
                  defaultValue={editingQuestion?.kind ?? "tunggal"}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                >
                  <option value="tunggal">Pilihan Tunggal</option>
                  <option value="jamak">Pilihan Jamak</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold">
                  Kunci Jawaban (A/B/C/D atau ABD)
                </label>
                <input
                  name="answerKey"
                  type="text"
                  required
                  defaultValue={editingQuestion?.answerKey ?? "A"}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold">
                  Urutan Tryout (1–50)
                </label>
                <input
                  name="sortOrder"
                  type="number"
                  required
                  defaultValue={editingQuestion?.sortOrder ?? 50}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold">
                  ID Referensi (pisahkan koma)
                </label>
                <input
                  name="sourceIds"
                  type="text"
                  required
                  defaultValue={
                    editingQuestion?.sourceIds.join(",") ?? "S03"
                  }
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 pt-2">
              <div className="space-y-3 rounded-xl border border-border bg-surface-soft/50 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Konten Bahasa Indonesia (ID)
                </h4>
                <div className="space-y-1">
                  <label className="block text-xs font-medium">
                    Pertanyaan (ID)
                  </label>
                  <textarea
                    name="bodyId"
                    rows={3}
                    required
                    defaultValue={
                      editingQuestion?.translations.id.body ?? ""
                    }
                    className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm"
                  />
                </div>
                {OPTION_KEYS.map((key) => (
                  <div key={key} className="space-y-1">
                    <label className="block text-xs font-medium">
                      Opsi {key} (ID)
                    </label>
                    <input
                      name={`optionId${key}`}
                      type="text"
                      required
                      defaultValue={
                        editingQuestion?.translations.id.options[key] ?? ""
                      }
                      className="w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-sm"
                    />
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="block text-xs font-medium">
                    Pembahasan (ID)
                  </label>
                  <textarea
                    name="explanationId"
                    rows={2}
                    required
                    defaultValue={
                      editingQuestion?.translations.id.explanation ?? ""
                    }
                    className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-surface-soft/50 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Konten Bahasa Inggris (EN)
                </h4>
                <div className="space-y-1">
                  <label className="block text-xs font-medium">
                    Pertanyaan (EN)
                  </label>
                  <textarea
                    name="bodyEn"
                    rows={3}
                    required
                    defaultValue={
                      editingQuestion?.translations.en.body ?? ""
                    }
                    className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm"
                  />
                </div>
                {OPTION_KEYS.map((key) => (
                  <div key={key} className="space-y-1">
                    <label className="block text-xs font-medium">
                      Opsi {key} (EN)
                    </label>
                    <input
                      name={`optionEn${key}`}
                      type="text"
                      required
                      defaultValue={
                        editingQuestion?.translations.en.options[key] ?? ""
                      }
                      className="w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-sm"
                    />
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="block text-xs font-medium">
                    Pembahasan (EN)
                  </label>
                  <textarea
                    name="explanationEn"
                    rows={2}
                    required
                    defaultValue={
                      editingQuestion?.translations.en.explanation ?? ""
                    }
                    className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan Soal ke Database"}
            </Button>
          </form>
        </Card>
      )}

      <Card className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="py-2.5 pr-3 font-semibold">ID</th>
                <th className="py-2.5 px-3 font-semibold">Topik</th>
                <th className="py-2.5 px-3 font-semibold">Jenis</th>
                <th className="py-2.5 px-3 font-semibold">Kunci</th>
                <th className="py-2.5 px-3 font-semibold">Pertanyaan (ID)</th>
                <th className="py-2.5 pl-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredQuestions.map((q) => (
                <tr key={q.id}>
                  <td className="py-3 pr-3 font-mono text-xs font-bold text-accent">
                    {q.id}
                  </td>
                  <td className="py-3 px-3 text-xs text-muted">{q.topic}</td>
                  <td className="py-3 px-3">
                    <Badge
                      variant={q.kind === "jamak" ? "caution" : "neutral"}
                    >
                      {q.kind}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 font-mono text-xs font-semibold text-emerald-800">
                    {q.answerKey}
                  </td>
                  <td className="py-3 px-3 text-xs text-foreground max-w-md truncate">
                    {q.translations.id.body}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenEdit(q)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={isDeleting}
                        onClick={() => setDeleteTargetQuestion(q)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={Boolean(deleteTargetQuestion)}
        title="Konfirmasi Hapus Soal"
        description={
          deleteTargetQuestion
            ? `Apakah Anda yakin ingin menghapus soal ${deleteTargetQuestion.id} (${TOPICS[deleteTargetQuestion.topic]}) dari bank soal database?`
            : ""
        }
        confirmLabel="Ya, Hapus Soal"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteQuestion}
        onCancel={() => setDeleteTargetQuestion(null)}
      />

      {formState && (
        <StatusPopup
          isOpen={isFormPopupOpen}
          status={formState.ok ? "success" : "error"}
          title={
            formState.ok ? "Soal Berhasil Disimpan" : "Gagal Menyimpan Soal"
          }
          message={formState.ok ? formState.data : formState.error}
          onClose={() => setDismissedFormState(formState)}
        />
      )}

      {deleteFeedback && (
        <StatusPopup
          isOpen={Boolean(deleteFeedback)}
          status={deleteFeedback.ok ? "success" : "error"}
          title={
            deleteFeedback.ok ? "Soal Berhasil Dihapus" : "Gagal Menghapus Soal"
          }
          message={deleteFeedback.message}
          onClose={() => setDeleteFeedback(null)}
        />
      )}
    </div>
  );
}
