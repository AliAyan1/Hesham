export default function DashboardLoading() {
  return (
    <div
      className="flex min-h-[400px] flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#EFF6FF] border-t-[#0F4C75]"
        aria-hidden
      />
      <p className="text-sm text-[#6B7280]">Loading...</p>
    </div>
  );
}
