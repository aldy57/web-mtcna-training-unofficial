"use client";

import { useEffect, useRef, useState } from "react";
import { FormattedAiText } from "@/components/ai/FormattedAiText";

export interface TypewriterAiTextProps {
  content: string;
  isNew?: boolean;
  onProgress?: () => void;
  onComplete?: () => void;
  className?: string;
}

/**
 * Komponen pembungkus respon AI yang menampilkan teks secara progresif
 * dengan efek animasi ketik layaknya Google Gemini atau ChatGPT.
 */
export function TypewriterAiText({
  content,
  isNew = false,
  onProgress,
  onComplete,
  className = "",
}: TypewriterAiTextProps) {
  const [displayedLength, setDisplayedLength] = useState(() =>
    isNew ? 0 : content.length,
  );
  const [isDone, setIsDone] = useState(() => !isNew);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onProgressRef.current = onProgress;
    onCompleteRef.current = onComplete;
  }, [onProgress, onComplete]);

  useEffect(() => {
    if (!isNew || isDone) {
      return;
    }

    const total = content.length;
    if (total === 0) {
      return;
    }

    // Kecepatan adaptif: total durasi sekitar 1.5 - 2.5 detik
    // Respons pendek (< 200 karakter) bertambah 2-3 char
    // Respons panjang (> 1000 karakter) bertambah 12-25 char per 18ms
    const targetSteps = Math.min(80, Math.max(30, Math.round(total / 18)));
    const chunkSize = Math.max(2, Math.ceil(total / targetSteps));
    const intervalMs = 18;

    let current = 0;
    const timer = setInterval(() => {
      current += chunkSize;
      if (current >= total) {
        current = total;
        clearInterval(timer);
        setDisplayedLength(total);
        setIsDone(true);
        onProgressRef.current?.();
        onCompleteRef.current?.();
      } else {
        setDisplayedLength(current);
        onProgressRef.current?.();
      }
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [content, isNew, isDone]);

  function handleSkip() {
    setDisplayedLength(content.length);
    setIsDone(true);
    onProgressRef.current?.();
    onCompleteRef.current?.();
  }

  if (isDone || !isNew) {
    return <FormattedAiText content={content} className={className} />;
  }

  const displayedContent = content.slice(0, displayedLength);

  return (
    <div className="relative">
      <FormattedAiText content={displayedContent} className={className} />

      {/* Indikator kursor aktif yang berdenyut lembut di ujung teks */}
      <span
        aria-hidden="true"
        className="inline-block h-3.5 w-1.5 ml-1 bg-accent/90 rounded-2xs align-middle animate-pulse"
      />

      {/* Tombol opsi lewati animasi untuk jawaban panjang */}
      <div className="mt-2 flex items-center">
        <button
          type="button"
          onClick={handleSkip}
          className="text-[10px] text-muted hover:text-accent font-medium inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <span>Tampilkan semua</span>
          <span>⚡</span>
        </button>
      </div>
    </div>
  );
}
