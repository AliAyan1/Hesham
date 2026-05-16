"use client";

import { type ReactNode, useEffect, useState } from "react";

/**
 * Renders children only after mount so SSR markup matches the first client paint.
 * Password managers (LastPass, etc.) inject nodes/attributes into forms before React
 * hydrates, which causes hydration mismatch errors.
 */
export function ClientHydrationGate({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  return ready ? children : fallback;
}
