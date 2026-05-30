"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MentorCertificationDto } from "@/lib/mentor/certification-types";

export function MentorCertificationsDisplay({
  certifications,
}: {
  certifications: MentorCertificationDto[];
}) {
  const t = useTranslations("mentor");

  if (certifications.length === 0) return null;

  function isImage(mime: string | null): boolean {
    return mime?.startsWith("image/") ?? false;
  }

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="font-bold text-[#0D2137]">{t("certifications")}</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {certifications.map((c) => (
          <li key={c.id} className="rounded-lg border border-[#EEF2F7] p-4">
            <p className="font-semibold text-[#0D2137]">{c.name}</p>
            {c.issuer ? <p className="text-sm text-[#6B7280]">{c.issuer}</p> : null}
            {c.issuedAt ? (
              <p className="text-xs text-[#9CA3AF]">{new Date(c.issuedAt).toLocaleDateString()}</p>
            ) : null}
            <a
              href={c.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block"
            >
              {isImage(c.mimeType) ? (
                <img
                  src={c.fileUrl}
                  alt=""
                  className="max-h-40 w-full rounded-lg border object-contain"
                />
              ) : (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-brand-teal underline">
                  <FileText className="h-4 w-4" aria-hidden />
                  {t("certViewPdf")}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
