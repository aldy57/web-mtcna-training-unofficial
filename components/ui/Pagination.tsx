import { Button } from "@/components/ui/Button";
import {
  calculatePagination,
  getPaginationItems,
  type PaginationItem,
} from "@/lib/pagination";

export type { PaginationItem };

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  itemLabel?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  itemLabel = "data",
  className = "",
}: PaginationProps) {
  if (totalPages <= 0 && (!totalItems || totalItems === 0)) {
    return null;
  }

  const { safePage, totalPages: calculatedTotal, startIdx, endIdx } =
    totalItems !== undefined && pageSize !== undefined
      ? calculatePagination(totalItems, currentPage, pageSize)
      : {
          safePage: Math.min(Math.max(1, currentPage), Math.max(1, totalPages)),
          totalPages: Math.max(1, totalPages),
          startIdx: 0,
          endIdx: 0,
        };

  const finalTotalPages = totalPages || calculatedTotal;
  const paginationItems = getPaginationItems(safePage, finalTotalPages);

  return (
    <nav
      aria-label="Navigasi halaman"
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/80 ${className}`.trim()}
    >
      {totalItems !== undefined && pageSize !== undefined ? (
        <span className="text-xs text-muted font-mono text-center sm:text-left">
          Menampilkan {totalItems === 0 ? 0 : startIdx + 1}–{endIdx} dari{" "}
          {totalItems} {itemLabel}
        </span>
      ) : (
        <span />
      )}

      <div className="flex items-center justify-center gap-1.5 w-full sm:w-auto">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className="px-2.5 sm:px-3 py-1 text-xs shrink-0"
          aria-label="Halaman sebelumnya"
        >
          <span className="sm:hidden">← Prev</span>
          <span className="hidden sm:inline">← Sebelumnya</span>
        </Button>

        {/* Di mobile: Label Halaman X / Y */}
        <span className="text-xs font-semibold text-foreground px-2 tabular-nums sm:hidden">
          {safePage} / {finalTotalPages}
        </span>

        {/* Di desktop: Nomor Halaman Interaktif */}
        <div className="hidden sm:flex items-center gap-1">
          {paginationItems.map((item, idx) => {
            if (typeof item === "string") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="flex h-7 w-7 items-center justify-center text-xs text-muted select-none"
                  aria-hidden="true"
                >
                  …
                </span>
              );
            }

            const isActive = item === safePage;
            return (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? "bg-accent text-white shadow-2xs"
                    : "border border-border text-foreground hover:bg-neutral-100"
                }`}
                aria-label={`Halaman ${item}`}
                aria-current={isActive ? "page" : undefined}
              >
                {item}
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={safePage >= finalTotalPages}
          onClick={() => onPageChange(Math.min(finalTotalPages, safePage + 1))}
          className="px-2.5 sm:px-3 py-1 text-xs shrink-0"
          aria-label="Halaman berikutnya"
        >
          <span className="sm:hidden">Next →</span>
          <span className="hidden sm:inline">Berikutnya →</span>
        </Button>
      </div>
    </nav>
  );
}
