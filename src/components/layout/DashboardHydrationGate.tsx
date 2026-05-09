"use client";

import { type ReactNode, useEffect, useState } from "react";

/**
 * Renders real dashboard chrome after mount so SSR markup matches first paint.
 * Browser extensions (password managers / form fillers) often inject attributes such as
 * `fdprocessedid` on `<button>` and `<input>` between HTML parse and hydration,
 * which triggers React “hydration mismatch”. Deferring interactive UI avoids that.
 */
export function DashboardHydrationGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen max-w-[100vw] bg-[#F8FAFC]" aria-busy="true" aria-label="Loading dashboard">
        <div className="h-14 animate-pulse border-b border-gray-100 bg-white" />
        <div className="flex max-w-[100vw]">
          <div className="hidden min-h-[calc(100vh-3.5rem)] w-64 shrink-0 border-e border-gray-100 bg-white md:block">
            <div className="space-y-3 p-4">
              <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
              <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
              <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
            </div>
          </div>
          <div className="min-h-[calc(100vh-3.5rem)] flex-1 p-4 md:p-8">
            <div className="mb-8 h-9 max-w-md animate-pulse rounded-lg bg-gray-200" />
            <div className="h-[min(520px,65vh)] animate-pulse rounded-2xl bg-gray-200/80" />
          </div>
        </div>
      </div>
    );
  }

  return children;
}
