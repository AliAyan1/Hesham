"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import type { NotificationDto } from "@/types/dashboard";
import { Bell } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/cn";
import { Link } from "@/i18n/navigation";

type NotificationBellProps = {
  locale: string;
  /** Tighter toolbar target (dashboard header). */
  compact?: boolean;
};

function TypeIcon({ type }: { type: NotificationDto["type"] }) {
  switch (type) {
    case "JOB_MATCH":
      return (
        <span className="text-brand-teal" aria-hidden>
          💼
        </span>
      );
    case "APPLICATION_UPDATE":
      return (
        <span className="text-brand-blue" aria-hidden>
          📋
        </span>
      );
    case "ASSESSMENT_READY":
      return (
        <span className="text-brand-teal" aria-hidden>
          🧠
        </span>
      );
    case "SESSION_REMINDER":
      return (
        <span className="text-yellow-600" aria-hidden>
          ⏰
        </span>
      );
    case "SYSTEM":
    default:
      return (
        <span className="text-gray-600" aria-hidden>
          🔔
        </span>
      );
  }
}

const PANEL_MAX_W = 352;
const VIEWPORT_GUTTER = 16;

export function NotificationBell({ locale, compact = false }: NotificationBellProps) {
  const t = useTranslations("notifications");
  const loc = useLocale();
  const isRtl = loc === "ar" || loc === "ur";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDto[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const updatePanelPosition = useCallback(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const width = Math.min(PANEL_MAX_W, vw - VIEWPORT_GUTTER * 2);
    let left: number;
    if (isRtl) {
      left = rect.left;
    } else {
      left = rect.right - width;
    }
    left = Math.max(VIEWPORT_GUTTER, Math.min(left, vw - width - VIEWPORT_GUTTER));
    const top = rect.bottom + 8;
    setPanelStyle({
      position: "fixed",
      top,
      left,
      width,
      zIndex: 100,
    });
  }, [open, isRtl]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onWin = () => updatePanelPosition();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setPanelStyle(null);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const data: { items: NotificationDto[] } = await res.json();
      setItems(data.items);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, []);

  async function handleToggle() {
    const next = !open;
    if (next && items === null) {
      await load();
    }
    if (!next) {
      setPanelStyle(null);
    }
    setOpen(next);
  }

  const unread = items?.filter((n) => !n.isRead).length ?? 0;

  async function markOne(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids: [id] }),
    });
    setItems((prev) =>
      prev
        ? prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        : prev,
    );
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

  return (
    <div ref={wrapRef} className="relative" dir={isRtl ? "rtl" : "ltr"}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => void handleToggle()}
        className={cn(
          "relative inline-flex items-center justify-center rounded-lg border border-transparent bg-transparent text-gray-700 hover:bg-gray-100",
          compact
            ? "h-8 w-8 shrink-0 text-brand-teal hover:bg-brand-lightTeal/50"
            : "min-h-11 min-w-11 rounded-full text-brand-teal hover:bg-brand-lightTeal/60",
          "transition-colors duration-150",
        )}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t("openMenuAria")}
      >
        <Bell className="h-5 w-5" strokeWidth={2} aria-hidden />
        {unread > 0 ? (
          <>
            <span
              className={cn(
                "absolute inline-flex h-2 w-2 rounded-full bg-brand-teal animate-ping opacity-75",
                compact ? "end-1 top-1" : "end-2 top-1.5",
              )}
            />
            <span
              className={cn(
                "absolute flex min-w-[16px] items-center justify-center rounded-full bg-brand-teal px-1 text-[10px] font-bold text-white shadow-sm",
                compact ? "-end-0.5 -top-0.5 h-[15px]" : "-end-0.5 -top-0.5 h-[18px] min-w-[18px] px-[5px] text-[11px]",
              )}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          </>
        ) : null}
      </button>

      {open && panelStyle ? (
        <div
          style={panelStyle}
          className="rounded-xl border border-gray-100 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
            <p className="text-sm font-semibold text-brand-blue">{t("title")}</p>
            <button
              type="button"
              onClick={() => markAll()}
              className="min-h-11 whitespace-nowrap rounded-lg px-2 text-xs font-medium text-brand-teal hover:bg-brand-lightTeal"
              disabled={(items?.filter((i) => !i.isRead).length ?? 0) === 0}
            >
              {t("markAllRead")}
            </button>
          </div>

          <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto" role="list">
            {status === "loading" || items === null ? (
              <li className="flex justify-center py-6">
                <LoadingSpinner size="md" />
              </li>
            ) : status === "error" ? (
              <li className="px-4 py-6 text-center text-sm text-red-600">{t("loadFailed")}</li>
            ) : items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-gray-600">{t("empty")}</li>
            ) : (
              items.slice(0, 5).map((n) => (
                <li key={n.id} className="px-4 py-3">
                  <div className="flex gap-3">
                    <span className="mt-1 shrink-0">
                      <TypeIcon type={n.type} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-brand-blue">{displayTitle(n)}</p>
                      <p className="mt-1 break-words text-xs text-gray-600">{displayMessage(n)}</p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {new Date(n.createdAt).toLocaleString(locale)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {!n.isRead ? (
                          <button
                            type="button"
                            className="min-h-11 rounded border border-brand-blue px-3 text-xs text-brand-blue hover:bg-brand-lightBlue"
                            onClick={() => markOne(n.id)}
                            aria-label={t("markReadAria")}
                          >
                            {t("markReadAria")}
                          </button>
                        ) : null}
                        {n.link ? (
                          <Link
                            href={n.link}
                            className="min-h-11 inline-flex items-center px-3 text-xs font-medium text-brand-teal underline"
                          >
                            {t("openLink")}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
