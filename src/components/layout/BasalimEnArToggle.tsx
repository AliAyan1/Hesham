"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  applyDocumentDirection,
  persistLocalePreference,
} from "@/lib/locale-preference";
import { cn } from "@/lib/cn";

type BasalimEnArToggleProps = {
  className?: string;
  tone?: "light" | "dark";
};

export function BasalimEnArToggle({ className, tone = "light" }: BasalimEnArToggleProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function setLocale(next: "en" | "ar") {
    if (locale === next) return;
    persistLocalePreference(next);
    applyDocumentDirection(next);
    router.replace(pathname, { locale: next });
  }

  const isDark = tone === "dark";

  return (
    <div
      className={cn(
        "inline-flex rounded-md border p-0.5 text-xs font-semibold",
        isDark ? "border-white/20 bg-white/5" : "border-gray-200 bg-gray-50",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {(["en", "ar"] as const).map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={cn(
              "min-w-[2.25rem] rounded px-2 py-1.5 uppercase transition-colors",
              active
                ? isDark
                  ? "bg-white text-[#0D1F2D]"
                  : "bg-[#1A6B5A] text-white"
                : isDark
                  ? "text-white/70 hover:text-white"
                  : "text-gray-600 hover:text-[#0D1F2D]",
            )}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
