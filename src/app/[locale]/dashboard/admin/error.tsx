"use client";

import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/ui/ErrorState";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const tc = useTranslations("common");
  return (
    <div className="p-8">
      <ErrorState
        title="Admin dashboard error"
        onRetry={reset}
        retryLabel={tc("retry")}
      />
    </div>
  );
}
