export default function RootLoading() {
  return (
    <div
      className="w-full space-y-5 py-4"
      role="status"
      aria-label="Memuat halaman"
    >
      <div className="h-4 w-36 animate-pulse rounded-full bg-surface-soft" />
      <div className="h-8 w-72 animate-pulse rounded-xl bg-surface-soft" />
      <div className="h-36 w-full animate-pulse rounded-2xl bg-surface-soft" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-24 animate-pulse rounded-2xl bg-surface-soft" />
        <div className="h-24 animate-pulse rounded-2xl bg-surface-soft" />
      </div>
    </div>
  );
}

