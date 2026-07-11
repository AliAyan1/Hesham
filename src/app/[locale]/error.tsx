"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

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
      <Image src="/logo.png" alt="QudrahTech" width={180} height={58} priority className="h-auto w-auto" />
      <h1 className="text-xl font-black text-[#0D2137]">{t("error")}</h1>
      <p className="max-w-md text-sm text-[#6B7280]">{t("friendlyError")}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="min-h-11 rounded-xl bg-[#0F4C75] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0D2137]"
      >
        {t("retry")}
      </button>
    </div>
  );
}

