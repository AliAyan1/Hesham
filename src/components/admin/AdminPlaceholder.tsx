"use client";

import { useTranslations } from "next-intl";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export function AdminPlaceholder({ title }: { title: string }) {
  const t = useTranslations("adminPanel.placeholder");
  return (
    <div>
      <AdminPageHeader title={title} pollIntervalSec={30} />
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-bold text-[#0D2137]">{t("title")}</h2>
        <p className="mt-2 text-sm text-[#6B7280]">{t("body")}</p>
      </div>
    </div>
  );
}
