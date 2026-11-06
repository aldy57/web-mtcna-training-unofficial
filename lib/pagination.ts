export type PaginationItem =
  | number
  | "ellipsis-start"
  | "ellipsis-end";

export interface PaginationState {
  totalPages: number;
  safePage: number;
  startIdx: number;
  endIdx: number;
}

/**
 * Menghitung status kalkulasi halaman dan indeks slice data
 */
export function calculatePagination(
  totalItems: number,
  currentPage: number,
  pageSize: number,
): PaginationState {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safePage - 1) * safePageSize;
  const endIdx = Math.min(startIdx + safePageSize, totalItems);

  return {
    totalPages,
    safePage,
    startIdx,
    endIdx,
  };
}

/**
 * Menghasilkan array nomor halaman dan tanda ellipsis untuk pagination responsif
 */
export function getPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis-start",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis-start",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-end",
    totalPages,
  ];
}

