import { BasalimLogo } from "@/components/layout/BasalimLogo";

/** Shown while public marketing routes stream in — Basalim brand only. */
export function BasalimPageLoading() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-white px-6">
      <BasalimLogo compact priority />
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-[#1A6B5A]"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
