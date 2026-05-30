"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { GraduationCap } from "lucide-react";

export default function MentorPortalLegacyClient({ locale: _locale }: { locale: string }) {
  void _locale;
  const t = useTranslations("mentor");

  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-xl border bg-white p-8 text-center shadow-sm">
      <GraduationCap className="mx-auto h-12 w-12 text-[#C9973A]" aria-hidden />
      <h1 className="text-2xl font-bold text-[#0D2137]">{t("legacyPortalTitle")}</h1>
      <p className="text-sm text-[#6B7280]">{t("legacyPortalMessage")}</p>
      <Link
        href="/auth/register?role=mentor"
        className="inline-flex rounded-lg bg-[#C9973A] px-6 py-2.5 text-sm font-semibold text-white"
      >
        {t("legacyPortalCta")}
      </Link>
      <Link href="/dashboard/job-seeker" className="block text-sm text-brand-teal hover:underline">
        {t("backToMentors")}
      </Link>
    </div>
  );
}
