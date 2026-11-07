"use client";

import { useMemo, useState, useTransition } from "react";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmDialog } from "@/components/ui/PopupModal";
import {
  deleteMaterialAction,
  upsertMaterialAction,
} from "@/lib/actions/material-actions";
import { calculatePagination } from "@/lib/pagination";
import { showToast } from "@/lib/toast";
import type { ReferenceSource } from "@/lib/types";

interface AdminMaterialManagerProps {
  initialMaterials: ReferenceSource[];
  usageMap: Record<string, string[]>;
}

const ITEMS_PER_PAGE = 10;

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
      <path d="m15 5 4 4" />
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
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function getDomain(urlStr: string): string {
  try {
    return new URL(urlStr).hostname.replace(/^www\./, "");
  } catch {
    return "mikrotik.com";
  }
}

export function AdminMaterialManager({
  initialMaterials,
  usageMap,
}: AdminMaterialManagerProps) {
  const [materials, setMaterials] = useState<ReferenceSource[]>(initialMaterials);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // State Form Modal Tambah / Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReferenceSource | null>(null);
  const [formId, setFormId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState("");

  // State Modal Hapus
  const [deleteTarget, setDeleteTarget] = useState<ReferenceSource | null>(null);

  const filteredMaterials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return materials;

    return materials.filter((item) => {
      const matchId = item.id.toLowerCase().includes(q);
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q) ?? false;
      const matchUrl = item.url.toLowerCase().includes(q);
      return matchId || matchTitle || matchDesc || matchUrl;
    });
  }, [materials, searchQuery]);

  const { totalPages, safePage, startIdx, endIdx } = calculatePagination(
    filteredMaterials.length,
    currentPage,
    ITEMS_PER_PAGE,
  );

  const paginatedMaterials = useMemo(() => {
    return filteredMaterials.slice(startIdx, endIdx);
  }, [filteredMaterials, startIdx, endIdx]);

  function handleOpenCreate() {
    setEditingItem(null);
    setFormId(`S${materials.length + 1}`);
    setFormTitle("");
    setFormUrl("");
    setFormDescription("");
    setFormError("");
    setIsFormOpen(true);
  }

  function handleOpenEdit(item: ReferenceSource) {
    setEditingItem(item);
    setFormId(item.id);
    setFormTitle(item.title);
    setFormUrl(item.url);
    setFormDescription(item.description || "");
    setFormError("");
    setIsFormOpen(true);
  }

  function handleSaveForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!formId.trim() || !formTitle.trim() || !formUrl.trim()) {
      setFormError("ID, Judul, dan URL wajib diisi.");
      return;
    }

    startTransition(async () => {
      const res = await upsertMaterialAction({
        id: formId.trim(),
        title: formTitle.trim(),
        url: formUrl.trim(),
        description: formDescription.trim(),
      });

      if (!res.ok) {
        setFormError(res.error);
        return;
      }

      setMaterials((prev) => {
        const index = prev.findIndex((m) => m.id === res.data.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = res.data;
          return next;
        }
        return [...prev, res.data];
      });

      setIsFormOpen(false);
      showToast({
        type: "success",
        title: editingItem
          ? "Sumber materi berhasil diperbarui"
          : "Sumber materi baru berhasil ditambahkan",
        message: `${res.data.id} — ${res.data.title}`,
      });
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;

    startTransition(async () => {
      const res = await deleteMaterialAction({ id: deleteTarget.id });
      if (!res.ok) {
        showToast({
          type: "error",
          title: "Gagal menghapus",
          message: res.error,
        });
        setDeleteTarget(null);
        return;
      }

      setMaterials((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      showToast({
        type: "success",
        title: "Sumber materi berhasil dihapus",
        message: `Materi ${deleteTarget.id} telah dihapus dari sistem.`,
      });
      setDeleteTarget(null);
    });
  }

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Header Info & Tombol Tambah */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Manajemen Konten
          </p>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Kelola Sumber Materi
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            Atur dokumentasi dan bahan acuan resmi yang ditampilkan ke
            peserta.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleOpenCreate}
          className="shrink-0 flex items-center gap-1.5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          <span>Tambah Sumber Materi</span>
        </Button>
      </div>

      {/* Ringkasan & Pencarian */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari ID, judul materi, atau URL..."
              className="w-full pl-3.5 pr-4 py-2 text-sm rounded-xl border border-border bg-surface text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all shadow-2xs"
            />
          </div>

          <div className="text-xs text-muted">
            Total{" "}
            <span className="font-semibold text-foreground">
              {filteredMaterials.length}
            </span>{" "}
            sumber materi terdaftar
          </div>
        </div>

        {/* Tabel Data Materi */}
        {filteredMaterials.length === 0 ? (
          <p className="text-xs text-muted py-6 text-center">
            Tidak ada sumber materi yang sesuai dengan pencarian.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="py-2.5 pr-3 font-semibold w-16">Kode ID</th>
                    <th className="py-2.5 px-3 font-semibold">Judul &amp; Deskripsi</th>
                    <th className="py-2.5 px-3 font-semibold">Tautan Dokumentasi</th>
                    <th className="py-2.5 pl-3 font-semibold text-right w-16">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedMaterials.map((item) => {
                    const domain = getDomain(item.url);

                    return (
                      <tr key={item.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-3 pr-3 font-mono text-xs font-semibold text-foreground">
                          <Badge variant="accent">{item.id}</Badge>
                        </td>
                        <td className="py-3 px-3 min-w-[220px]">
                          <p className="font-semibold text-foreground text-sm">
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-xs text-muted leading-relaxed mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 min-w-[180px]">
                          <div className="space-y-0.5">
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-100 text-muted font-medium border border-border/60">
                              {domain}
                            </span>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs text-accent hover:text-accent-hover truncate max-w-[200px]"
                              title={item.url}
                            >
                              {item.url}
                            </a>
                          </div>
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <ActionMenu
                            ariaLabel={`Aksi untuk materi ${item.id}`}
                            items={[
                              {
                                key: "edit",
                                label: "Edit",
                                icon: <EditIcon />,
                                onClick: () => handleOpenEdit(item),
                              },
                              {
                                key: "delete",
                                label: "Hapus",
                                icon: <TrashIcon />,
                                variant: "danger",
                                disabled: isPending,
                                onClick: () => setDeleteTarget(item),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredMaterials.length}
              pageSize={ITEMS_PER_PAGE}
              itemLabel="sumber materi"
            />
          </div>
        )}
      </Card>

      {/* Modal Dialog Form Tambah / Edit */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="material-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 id="material-modal-title" className="text-lg font-semibold text-foreground">
                {editingItem ? "Edit Sumber Materi" : "Tambah Materi Baru"}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-muted hover:text-foreground text-sm cursor-pointer p-1"
                aria-label="Tutup form"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-3.5">
              <div className="space-y-1">
                <label htmlFor="material-id" className="block text-xs font-semibold text-foreground">
                  Kode ID Unik
                </label>
                <input
                  id="material-id"
                  type="text"
                  required
                  disabled={Boolean(editingItem) || isPending}
                  value={formId}
                  onChange={(e) => setFormId(e.target.value.toUpperCase())}
                  placeholder="Contoh: S30 atau DOC-ROUTING"
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
                />
                <p className="text-[11px] text-muted">
                  Hanya boleh berisi huruf, angka, tanda minus (-), atau garis bawah (_).
                </p>
              </div>

              <div className="space-y-1">
                <label htmlFor="material-title" className="block text-xs font-semibold text-foreground">
                  Judul Materi
                </label>
                <input
                  id="material-title"
                  type="text"
                  required
                  disabled={isPending}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: IP Routing & Gateway Selection"
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="material-url" className="block text-xs font-semibold text-foreground">
                  URL Dokumentasi Resmi
                </label>
                <input
                  id="material-url"
                  type="url"
                  required
                  disabled={isPending}
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="Masukan URL Materi di sini"
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="material-desc" className="block text-xs font-semibold text-foreground">
                  Deskripsi / Ringkasan (Opsional)
                </label>
                <textarea
                  id="material-desc"
                  rows={3}
                  disabled={isPending}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ringkasan konsep pokok atau petunjuk yang dibahas dalam dokumentasi ini..."
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => setIsFormOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary" disabled={isPending}>
                  {isPending ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Tambah Materi"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog Konfirmasi Hapus */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Konfirmasi Hapus Sumber Materi"
        description={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus sumber materi "${deleteTarget.id} — ${deleteTarget.title}"?${
                (usageMap[deleteTarget.id] ?? []).length > 0
                  ? ` Perhatian: Materi ini saat ini digunakan pada ${
                      (usageMap[deleteTarget.id] ?? []).length
                    } soal latihan.`
                  : ""
              }`
            : ""
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

