export function PageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-100" />
      <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-gray-100" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-gray-100 bg-white" />
        ))}
      </div>

      <div className="mt-10 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

