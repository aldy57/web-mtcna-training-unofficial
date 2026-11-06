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
import type { AiDynamicSettings } from "@/lib/types";

export interface AiDynamicSettingsCardProps {
  initialSettings: AiDynamicSettings;
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

  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await updateAiDynamicSettingsAction({
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        userTokenBudget: Number(userTokenBudget),
        quotaResetDays: Number(quotaResetDays),
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
      setFeedback({
        type: "ok",
        text: "Konfigurasi AI berhasil diperbarui dan langsung aktif tanpa restart server.",
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
              Endpoint proxy AI kompatibel format OpenAI (contoh:{" "}
              <code>https://router.ryzumi.net/v1</code>).
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
