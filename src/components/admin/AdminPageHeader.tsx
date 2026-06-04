"use client";

import { RefreshCw } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

function formatRelative(
  date: Date | undefined,
  format: ReturnType<typeof useFormatter>,
  t: (key: string, values?: Record<string, number>) => string,
): string {
  if (!date) return t("lastUpdatedNever");
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return t("lastUpdatedSeconds", { count: sec });
  const min = Math.floor(sec / 60);
  if (min < 60) return t("lastUpdatedMinutes", { count: min });
  return format.relativeTime(date, { now: new Date() });
}

export function AdminPageHeader({
  title,
  lastUpdated,
  isLoading,
  onRefresh,
  pollIntervalSec = 30,
}: {
  title: string;
  lastUpdated?: Date;
  isLoading?: boolean;
  onRefresh?: () => void;
  pollIntervalSec?: number;
}) {
  const t = useTranslations("adminPanel");
  const format = useFormatter();
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-[#0D2137] md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-[#6B7280]" suppressHydrationWarning>
          {clock}
        </p>
        <p className="mt-1 text-xs text-[#6B7280]">
          {formatRelative(lastUpdated, format, t)} · {t("autoRefresh", { seconds: pollIntervalSec })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
          {t("live")}
        </span>
        {onRefresh ? (
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={isLoading}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-[#0F4C75] px-4 py-2 text-sm font-semibold text-[#0F4C75] hover:bg-[#0F4C75]/5",
              isLoading && "opacity-60",
            )}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} aria-hidden />
            {t("refreshNow")}
          </button>
        ) : null}
      </div>
    </header>
  );
}
