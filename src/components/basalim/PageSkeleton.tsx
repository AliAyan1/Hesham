export function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="min-h-[40vh] bg-[#0D1F2D]/90" />
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-16 md:px-6">
        <div className="h-8 w-2/3 rounded bg-gray-200" />
        <div className="h-4 w-full rounded bg-gray-100" />
        <div className="h-4 w-5/6 rounded bg-gray-100" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="h-32 rounded-xl bg-gray-100" />
          <div className="h-32 rounded-xl bg-gray-100" />
          <div className="h-32 rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
