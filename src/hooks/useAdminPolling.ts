"use client";

import { useCallback, useEffect, useState } from "react";

export function useAdminPolling(
  fetchFn: () => Promise<void>,
  interval: number = 30000,
) {
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchFn();
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, interval);
    return () => clearInterval(timer);
  }, [refresh, interval]);

  return { lastUpdated, isLoading, refresh };
}
