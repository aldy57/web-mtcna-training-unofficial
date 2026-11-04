"use client";

import type { OptionKey } from "@/lib/types";

export interface OptionButtonProps {
  optionKey: OptionKey;
  label: string;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (key: OptionKey) => void;
}

export function OptionButton({
  optionKey,
  label,
  isSelected,
  isDisabled,
  onSelect,
}: OptionButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      disabled={isDisabled}
      onClick={() => onSelect(optionKey)}
      className={`w-full rounded-2xl border px-5 py-3.5 text-left text-sm transition-all cursor-pointer disabled:cursor-default disabled:opacity-85 ${
        isSelected
          ? "border-2 border-accent bg-surface-selected font-medium text-foreground"
          : "border-border bg-surface text-foreground hover:border-neutral-400 hover:bg-surface-soft"
      }`}
    >
      <span className="inline-block min-w-7 font-semibold text-accent">
        {optionKey}.
      </span>
      <span>{label}</span>
    </button>
  );
}

