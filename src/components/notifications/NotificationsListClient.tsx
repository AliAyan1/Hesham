"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { NotificationDto } from "@/types/dashboard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { NotificationTypeIcon } from "@/components/notifications/NotificationTypeIcon";

export function NotificationsListClient({ limit = 50 }: { limit?: number }) {
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isRtl = locale === "ar" || locale === "ur";
  const [items, setItems] = useState<NotificationDto[] | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/notifications?limit=${limit}`, { credentials: "include" });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const data = (await res.json()) as { items: NotificationDto[] };
      setItems(data.items);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markOne(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids: [id] }),
    });
    setItems((prev) => (prev ? prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)) : prev));
  }

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ markAll: true }),
    });
    setItems((prev) => (prev ? prev.map((n) => ({ ...n, isRead: true })) : prev));
  }

  const displayTitle = (n: NotificationDto) =>
    isRtl && n.titleAr?.trim() ? n.titleAr : n.title;
  const displayMessage = (n: NotificationDto) =>
    isRtl && n.messageAr?.trim() ? n.messageAr : n.message;

  if (status === "loading" || items === null) {
    return <LoadingSpinner size="full" label={tc("loading")} />;
  }

  if (status === "error") {
    return <ErrorState title={t("loadFailed")} retryLabel={tc("retry")} onRetry={load} />;
  }

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#6B7280]">
          {unread > 0 ? t("unreadCount", { count: String(unread) }) : t("allCaughtUp")}
        </p>
        <button
          type="button"
          onClick={() => void markAll()}
          disabled={unread === 0}
          className="rounded-lg border border-brand-teal px-4 py-2 text-sm font-semibold text-brand-teal disabled:opacity-40"
        >
          {t("markAllRead")}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border bg-white p-8 text-center text-sm text-[#6B7280]">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-[#EEF2F7] rounded-xl border bg-white shadow-sm" role="list">
          {items.map((n) => (
            <li key={n.id} className={`px-4 py-4 ${!n.isRead ? "bg-brand-lightTeal/20" : ""}`}>
              <div className="flex gap-3">
                <span className="mt-1 shrink-0">
                  <NotificationTypeIcon type={n.type} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#0D2137]">{displayTitle(n)}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">{displayMessage(n)}</p>
                  <p className="mt-2 text-xs text-[#9CA3AF]">
                    {new Date(n.createdAt).toLocaleString(locale)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!n.isRead ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-brand-teal underline"
                        onClick={() => void markOne(n.id)}
                      >
                        {t("markReadAria")}
                      </button>
                    ) : null}
                    {n.link ? (
                      <Link href={n.link} className="text-xs font-medium text-[#0F4C75] underline">
                        {t("openLink")}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
