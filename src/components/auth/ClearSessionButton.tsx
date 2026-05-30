"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { clearStuckSession } from "@/lib/auth-redirect";
import { cn } from "@/lib/cn";

type Props = {
  locale: string;
  className?: string;
  variant?: "link" | "button";
};

export function ClearSessionButton({ locale, className, variant = "link" }: Props) {
  const t = useTranslations("nav");
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      title={t("clearSessionHint")}
      aria-label={t("clearSession")}
      onClick={() => {
        setBusy(true);
        void clearStuckSession(locale);
      }}
      className={cn(
        variant === "button"
          ? "inline-flex min-h-9 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          : "text-xs font-medium text-amber-700 underline decoration-amber-400 underline-offset-2 hover:text-amber-900 disabled:opacity-50",
        className,
      )}
    >
      {busy ? t("clearSessionWorking") : t("clearSession")}
    </button>
  );
}
