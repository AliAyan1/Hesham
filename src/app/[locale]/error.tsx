"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BasalimLogo } from "@/components/layout/BasalimLogo";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");
  useEffect(() => {
    console.error("[locale/error]", error.message, error.digest ?? "");
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-white px-6 text-center">
      <BasalimLogo compact priority />
      <h1 className="text-xl font-black text-[#0D1F2D]">{t("error")}</h1>
      <p className="max-w-md text-sm text-[#6B7280]">{t("friendlyError")}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="min-h-11 rounded-xl bg-[#1A6B5A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#155A4A]"
        >
          {t("retry")}
        </button>
        <Link
          href="/"
          className="min-h-11 rounded-xl border border-[#0D1F2D]/20 px-6 py-3 text-sm font-semibold text-[#0D1F2D] hover:bg-[#F5F3EE]"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
