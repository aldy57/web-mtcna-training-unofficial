"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  resetAiDynamicSettingsToEnvAction,
  updateAiDynamicSettingsAction,
} from "@/lib/actions/ai-admin-actions";
import { formatAppDateTime } from "@/lib/format-date";
import type { AiCustomModel, AiDynamicSettings } from "@/lib/types";

export interface AiDynamicSettingsCardProps {
  initialSettings: AiDynamicSettings;
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

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
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

function SettingsSlidersIcon({ className = "h-5 w-5" }: { className?: string }) {
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
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="21" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="1" x2="7" y1="14" y2="14" />
      <line x1="9" x2="15" y1="8" y2="8" />
      <line x1="17" x2="23" y1="16" y2="16" />
    </svg>
  );
}

function CheckCircleIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function AiDynamicSettingsCard({
  initialSettings,
}: AiDynamicSettingsCardProps) {
  const [settings, setSettings] = useState<AiDynamicSettings>(initialSettings);
  const [baseUrl, setBaseUrl] = useState(initialSettings.baseUrl);
  const [model, setModel] = useState(initialSettings.model);
  const [userTokenBudget, setUserTokenBudget] = useState(
    initialSettings.userTokenBudget,
  );
  const [quotaResetDays, setQuotaResetDays] = useState(
    initialSettings.quotaResetDays,
  );
  const [availableModels, setAvailableModels] = useState<AiCustomModel[]>(
    initialSettings.availableModels && initialSettings.availableModels.length > 0
      ? initialSettings.availableModels
      : [
          {
            id: initialSettings.model,
            name: "MIRA Standar",
            description: "Model bawaan sistem",
            isActive: true,
            isDefault: true,
          },
        ],
  );

  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  function handleAddModel() {
    setAvailableModels((prev) => [
      ...prev,
      {
        id: "",
        name: "",
        description: "",
        isActive: true,
        isDefault: prev.length === 0,
      },
    ]);
  }

  function handleUpdateModel(
    index: number,
    field: keyof AiCustomModel,
    value: string | boolean,
  ) {
    setAvailableModels((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) {
          if (field === "isDefault" && value === true) {
            return { ...item, isDefault: false };
          }
          return item;
        }
        return { ...item, [field]: value };
      }),
    );
  }

  function handleRemoveModel(index: number) {
    if (availableModels.length <= 1) return;
    setAvailableModels((prev) => {
      const removed = prev[index];
      const next = prev.filter((_, idx) => idx !== index);
      if (removed.isDefault && next.length > 0) {
        next[0].isDefault = true;
      }
      return next;
    });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    const sanitizedModels = availableModels
      .map((m) => ({
        id: m.id.trim(),
        name: m.name.trim(),
        description: m.description?.trim() || undefined,
        isActive: m.isActive,
        isDefault: Boolean(m.isDefault),
      }))
      .filter((m) => m.id.length > 0 && m.name.length > 0);

    if (sanitizedModels.length === 0) {
      setFeedback({
        type: "err",
        text: "Minimal harus ada 1 model AI dengan ID teknis dan Nama Tampilan yang valid.",
      });
      return;
    }

    const hasDefault = sanitizedModels.some((m) => m.isDefault);
    if (!hasDefault) {
      sanitizedModels[0].isDefault = true;
    }

    const defaultModel =
      sanitizedModels.find((m) => m.isDefault)?.id || sanitizedModels[0].id;

    startTransition(async () => {
      const res = await updateAiDynamicSettingsAction({
        baseUrl: baseUrl.trim(),
        model: defaultModel,
        userTokenBudget: Number(userTokenBudget),
        quotaResetDays: Number(quotaResetDays),
        availableModels: sanitizedModels,
      });

      if (!res.ok) {
        setFeedback({ type: "err", text: res.error });
        return;
      }

      setSettings(res.data);
      setBaseUrl(res.data.baseUrl);
      setModel(res.data.model);
      setUserTokenBudget(res.data.userTokenBudget);
      setQuotaResetDays(res.data.quotaResetDays);
      setAvailableModels(res.data.availableModels);
      setFeedback({
        type: "ok",
        text: "Konfigurasi AI dan model peserta berhasil diperbarui dan langsung aktif.",
      });
    });
  }

  function handleResetToEnv() {
    const confirmed = window.confirm(
      "Kembalikan pengaturan AI ke nilai default file .env?",
    );
    if (!confirmed) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await resetAiDynamicSettingsToEnvAction();
      if (!res.ok) {
        setFeedback({ type: "err", text: res.error });
        return;
      }

      setSettings(res.data);
      setBaseUrl(res.data.baseUrl);
      setModel(res.data.model);
      setUserTokenBudget(res.data.userTokenBudget);
      setQuotaResetDays(res.data.quotaResetDays);
      setAvailableModels(res.data.availableModels);
      setFeedback({
        type: "ok",
        text: "Konfigurasi AI berhasil dikembalikan ke nilai default file .env.",
      });
    });
  }

  return (
    <Card className="space-y-4">
      {/* Header Kartu */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 text-accent">
            <SettingsSlidersIcon />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                Pengaturan Konfigurasi AI Dinamis
              </h3>
              <Badge variant={settings.isCustomized ? "accent" : "neutral"}>
                {settings.isCustomized ? "Kustom (Database)" : "Default (.env)"}
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Ubah model, URL router, budget kuota, atau masa reset tanpa perlu me-restart server.
            </p>
          </div>
        </div>

        {settings.updatedAt && (
          <span className="text-[11px] text-muted font-mono">
            Diperbarui: {formatAppDateTime(settings.updatedAt)}
          </span>
        )}
      </div>

      {/* Alert Feedback */}
      {feedback && (
        <div
          role="alert"
          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
            feedback.type === "ok"
              ? "border-emerald-200 bg-success-bg text-success-ink"
              : "border-red-200 bg-danger-bg text-danger-ink"
          }`}
        >
          {feedback.type === "ok" && <CheckCircleIcon />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Formulir Konfigurasi */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Base URL */}
          <div className="space-y-1.5">
            <label
              htmlFor="ai-base-url"
              className="text-xs font-semibold text-foreground"
            >
              Base URL AI Router
            </label>
            <input
              id="ai-base-url"
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              required
              disabled={isPending}
              placeholder="https://router.ryzumi.net/v1"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-mono text-foreground focus:border-accent focus:outline-hidden disabled:opacity-50"
            />
            <p className="text-[11px] text-muted">
              Endpoint AI API.
            </p>
          </div>

          {/* Model AI */}
          <div className="space-y-1.5">
            <label
              htmlFor="ai-model-name"
              className="text-xs font-semibold text-foreground"
            >
              Model AI yang Digunakan
            </label>
            <input
              id="ai-model-name"
              type="text"
              list="suggested-models"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
              disabled={isPending}
              placeholder="deepseek-v4-flash"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-mono text-foreground focus:border-accent focus:outline-hidden disabled:opacity-50"
            />
            <datalist id="suggested-models">
              <option value="deepseek-v4-flash" />
              <option value="deepseek-chat" />
              <option value="gpt-4o-mini" />
              <option value="gpt-4o" />
              <option value="claude-3-5-sonnet" />
            </datalist>
            <p className="text-[11px] text-muted">
              Pastikan nama model terdaftar dan didukung oleh akun API Key Anda.
            </p>
          </div>

          {/* User Token Budget */}
          <div className="space-y-1.5">
            <label
              htmlFor="ai-user-budget"
              className="text-xs font-semibold text-foreground"
            >
              Batas Token per Peserta (User Budget)
            </label>
            <input
              id="ai-user-budget"
              type="number"
              min={500}
              max={10000000}
              step="any"
              value={userTokenBudget}
              onChange={(e) => setUserTokenBudget(Number(e.target.value))}
              required
              disabled={isPending}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-mono text-foreground focus:border-accent focus:outline-hidden disabled:opacity-50"
            />
            <p className="text-[11px] text-muted">
              Alokasi token maksimal untuk setiap peserta (contoh: 30.000 atau 100.000).
            </p>
          </div>

          {/* Durasi Reset Kuota */}
          <div className="space-y-1.5">
            <label
              htmlFor="ai-reset-days"
              className="text-xs font-semibold text-foreground"
            >
              Masa Reset Kuota Otomatis (Hari)
            </label>
            <input
              id="ai-reset-days"
              type="number"
              min={1}
              max={30}
              step={1}
              value={quotaResetDays}
              onChange={(e) => setQuotaResetDays(Number(e.target.value))}
              required
              disabled={isPending}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-mono text-foreground focus:border-accent focus:outline-hidden disabled:opacity-50"
            />
            <p className="text-[11px] text-muted">
              Token direset kembali ke 100% setelah habis.
            </p>
          </div>
        </div>

        {/* Seksi Manajemen Model AI untuk Peserta */}
        <div className="space-y-3 pt-3 border-t border-border/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Daftar Model AI untuk Peserta
              </h4>
              <p className="text-[11px] text-muted mt-0.5 max-w-2xl">
                Atur nama ramah dan aktifkan model. Jika <strong>hanya 1 model aktif</strong>, pemilih model otomatis disembunyikan di layar peserta (hanya mode Rendah/Sedang/Tinggi yang tampil). Jika <strong>2 atau lebih model aktif</strong>, pemilih model otomatis muncul di ruang chat peserta dengan Nama Tampilan yang Anda tentukan di bawah.
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddModel}
              disabled={isPending}
              className="inline-flex items-center gap-1.5"
            >
              <PlusIcon />
              <span>Tambah Model</span>
            </Button>
          </div>

          <div className="space-y-2.5">
            {availableModels.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-all space-y-2.5 ${
                  item.isActive
                    ? "border-border bg-surface"
                    : "border-border/50 bg-surface-soft/60 opacity-75"
                }`}
              >
                <div className="grid gap-2.5 sm:grid-cols-12 items-center">
                  {/* ID Model Teknis */}
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[11px] font-semibold text-muted block">
                      ID Model (Router API)
                    </label>
                    <input
                      type="text"
                      value={item.id}
                      onChange={(e) =>
                        handleUpdateModel(idx, "id", e.target.value)
                      }
                      placeholder="misal: gpt-6-luna atau deepseek-chat"
                      disabled={isPending}
                      required
                      className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-mono text-foreground focus:border-accent focus:outline-hidden"
                    />
                  </div>

                  {/* Nama Tampilan Peserta */}
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[11px] font-semibold text-muted block">
                      Nama Tampilan Peserta
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        handleUpdateModel(idx, "name", e.target.value)
                      }
                      placeholder="misal: MIRA Standar"
                      disabled={isPending}
                      required
                      className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground focus:border-accent focus:outline-hidden"
                    />
                  </div>

                  {/* Deskripsi Singkat */}
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[11px] font-semibold text-muted block">
                      Keterangan Singkat (Opsional)
                    </label>
                    <input
                      type="text"
                      value={item.description ?? ""}
                      onChange={(e) =>
                        handleUpdateModel(idx, "description", e.target.value)
                      }
                      placeholder="misal: Cepat & seimbang"
                      disabled={isPending}
                      className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:border-accent focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Kontrol Status & Default */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40 text-xs">
                  <div className="flex items-center gap-4">
                    {/* Toggle Aktif */}
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        onChange={(e) =>
                          handleUpdateModel(idx, "isActive", e.target.checked)
                        }
                        disabled={isPending}
                        className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <span
                        className={
                          item.isActive
                            ? "font-medium text-foreground"
                            : "text-muted"
                        }
                      >
                        {item.isActive ? "Aktif untuk Peserta" : "Dinonaktifkan"}
                      </span>
                    </label>

                    {/* Radio Default */}
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="default-ai-model"
                        checked={Boolean(item.isDefault)}
                        onChange={() => {
                          handleUpdateModel(idx, "isDefault", true);
                          if (item.id.trim()) {
                            setModel(item.id.trim());
                          }
                        }}
                        disabled={isPending}
                        className="h-4 w-4 border-border text-accent focus:ring-accent"
                      />
                      <span
                        className={
                          item.isDefault
                            ? "font-semibold text-accent"
                            : "text-muted"
                        }
                      >
                        {item.isDefault
                          ? "Model Utama (Default)"
                          : "Jadikan Default"}
                      </span>
                    </label>
                  </div>

                  {/* Tombol Hapus */}
                  {availableModels.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveModel(idx)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 text-[11px] text-danger-ink hover:underline cursor-pointer disabled:opacity-50"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      <span>Hapus Model</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/70">
          <div className="text-[11px] text-muted">
            Kunci API (<code>AI_API_KEY</code>) tetap aman di server <code>.env</code>.
          </div>

          <div className="flex items-center gap-2">
            {settings.isCustomized && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleResetToEnv}
                disabled={isPending}
              >
                Kembalikan ke Default .env
              </Button>
            )}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isPending}
            >
              {isPending ? "Menyimpan..." : "Simpan Pengaturan AI"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
