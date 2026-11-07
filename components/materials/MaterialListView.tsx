"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { calculatePagination } from "@/lib/pagination";
import type { ReferenceSource } from "@/lib/types";

const ITEMS_PER_PAGE = 10;

interface MaterialListViewProps {
  materials: ReferenceSource[];
}

function getDomainFromUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "mikrotik.com";
  }
}

function ExternalLinkIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
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
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function MaterialListView({
  materials,
}: MaterialListViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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

  const displayCount =
    filteredMaterials.length === 0
      ? "0"
      : startIdx + 1 === endIdx
        ? `${endIdx}`
        : `${startIdx + 1}–${endIdx}`;

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Header Info */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Sumber Materi
        </p>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Sumber &amp; Referensi Materi
        </h1>
        <p className="text-sm text-muted max-w-3xl leading-relaxed">
          Kumpulan Sumber & Referensi Materi yang dapat digunakan untuk belajar mandiri.
        </p>
      </div>

      {/* Bar Pencarian & Statistik Ringkas */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
            <SearchIcon className="h-4 w-4" />
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari materi, topik, atau kata kunci..."
            className="w-full pl-9.5 pr-4 py-2 text-sm rounded-xl border border-border bg-surface text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-muted hover:text-foreground cursor-pointer"
            >
              Hapus
            </button>
          )}
        </div>

        <div className="text-xs text-muted">
          Menampilkan{" "}
          <span className="font-semibold text-foreground">
            {displayCount}
          </span>{" "}
          dari {materials.length} sumber materi
        </div>
      </div>

      {/* Grid Kartu Materi */}
      {filteredMaterials.length === 0 ? (
        <Card className="p-10 text-center space-y-2">
          <p className="font-semibold text-foreground">
            Tidak ada materi yang cocok
          </p>
          <p className="text-xs text-muted">
            Coba gunakan kata kunci pencarian lain atau kosongkan kolom pencarian.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedMaterials.map((item) => {
              const domain = getDomainFromUrl(item.url);

              return (
                <Card
                  key={item.id}
                  className="p-5 flex flex-col justify-between space-y-4 hover:border-accent/40 transition-all shadow-2xs group"
                >
                  <div className="space-y-3">
                    {/* Baris Atas: Badge ID & Domain */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="accent" className="font-mono text-[11px] font-semibold">
                        {item.id}
                      </Badge>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-muted font-medium border border-border/60">
                        {domain}
                      </span>
                    </div>

                    {/* Judul Materi */}
                    <div>
                      <h2 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors leading-snug">
                        {item.title}
                      </h2>
                      {item.description && (
                        <p className="text-xs sm:text-sm text-muted leading-relaxed mt-1.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Baris Bawah: Tautan Buka Dokumentasi */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <span className="text-[11px] text-muted truncate max-w-[200px] sm:max-w-[260px]">
                      {item.url}
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-hover px-2.5 py-1 rounded-lg hover:bg-surface-selected transition-colors shrink-0"
                    >
                      <span>Buka Dokumentasi</span>
                      <ExternalLinkIcon className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </Card>
              );
            })}
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
    </div>
  );
}

