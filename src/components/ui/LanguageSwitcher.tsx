"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyDocumentDirection,
  persistLocalePreference,
} from "@/lib/locale-preference";

const LANGUAGES = [
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ur", label: "اردو", flag: "🇵🇰" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
] as const;

type LanguageSwitcherProps = {
  className?: string;
  /** `light` for white navbars, `dark` for dark footer/sidebar surfaces */
  tone?: "light" | "dark";
  /** Compact mode (sidebar bottom) */
  compact?: boolean;
  /** Dashboard header: flag + code only (e.g. 🇬🇧 EN), no long label */
  minimal?: boolean;
};

export function LanguageSwitcher({
  className,
  tone = "light",
  compact = false,
  minimal = false,
}: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const intlLocale = useLocale();
  const tNav = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const current = useMemo(() => {
    const found = LANGUAGES.find((l) => l.code === intlLocale);
    return found ?? LANGUAGES[0];
  }, [intlLocale]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function selectLocale(nextLocale: string) {
    if (nextLocale === intlLocale) {
      setOpen(false);
      return;
    }

    persistLocalePreference(nextLocale);
    applyDocumentDirection(nextLocale);
    router.replace(pathname, { locale: nextLocale });
    setOpen(false);
  }

  const isDark = tone === "dark";
  const trigger = minimal
    ? "inline-flex h-9 items-center gap-1 rounded-lg border px-2 text-xs font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
    : "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal";
  const triggerTone = isDark
    ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
    : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50";

  const panelTone = isDark
    ? "border-white/10 bg-[#0D2137]/95 text-white shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
    : "border-gray-200 bg-white text-gray-900 shadow-xl";

  return (
    <div ref={wrapRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => setOpen((o) => !o)}
        className={[
          trigger,
          triggerTone,
          minimal ? "shrink-0" : compact ? "min-h-10 px-2.5 py-2 text-xs font-bold" : "min-w-11",
        ].join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={tNav("language")}
      >
        <span aria-hidden>{current.flag}</span>
        {minimal ? (
          <span className="font-bold tabular-nums">{current.code.toUpperCase()}</span>
        ) : (
          <>
            <span className={compact ? "hidden" : "hidden sm:inline"}>{current.label}</span>
            {compact ? (
              <span className="rounded-md bg-brand-teal/15 px-1.5 py-0.5 text-[11px] font-bold text-brand-teal">
                {current.code.toUpperCase()}
              </span>
            ) : null}
          </>
        )}
        <svg
          className={
            minimal
              ? isDark
                ? "h-3 w-3 shrink-0 text-white/70"
                : "h-3 w-3 shrink-0 text-gray-500"
              : isDark
                ? "h-4 w-4 shrink-0 text-white/70"
                : "h-4 w-4 shrink-0 text-gray-500"
          }
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open ? (
        <ul
          role="listbox"
          className={[
            "absolute end-0 z-50 mt-2 min-w-[220px] overflow-hidden rounded-2xl border py-1",
            "origin-top-right animate-in fade-in zoom-in-95 duration-150",
            panelTone,
          ].join(" ")}
        >
          {LANGUAGES.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === intlLocale}>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => selectLocale(l.code)}
                className={[
                  "flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-start text-sm transition-colors",
                  l.code === intlLocale
                    ? isDark
                      ? "bg-white/10 text-white"
                      : "bg-brand-lightTeal text-brand-teal"
                    : isDark
                      ? "text-white/90 hover:bg-white/10"
                      : "text-gray-800 hover:bg-gray-50",
                ].join(" ")}
              >
                <span aria-hidden>{l.flag}</span>
                <span className="flex-1">{l.label}</span>
                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full border",
                    l.code === intlLocale
                      ? "border-brand-teal bg-brand-teal"
                      : isDark
                        ? "border-white/30 bg-transparent"
                        : "border-gray-300 bg-transparent",
                  ].join(" ")}
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
