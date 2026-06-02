export function PageLoadingSpinner() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div
        className="h-12 w-12 animate-spin rounded-full border-[3px] border-[#EFF6FF] border-t-[#0F4C75]"
        role="status"
        aria-label="Loading"
      />
      <p className="text-sm text-[#6B7280]">Loading...</p>
    </div>
  );
}
