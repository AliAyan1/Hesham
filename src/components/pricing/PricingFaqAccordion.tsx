"use client";

import { useTranslations } from "next-intl";

const FAQ_KEYS = ["faq1", "faq2", "faq3", "faq4", "faq5"] as const;

export function PricingFaqAccordion() {
  const t = useTranslations("pages.pricing");

  return (
    <div className="divide-y divide-gray-200 rounded-2xl border border-gray-100 bg-white shadow-sm">
      {FAQ_KEYS.map((key) => (
        <details key={key} className="group px-6 py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-start text-base font-semibold text-[#0D2137]">
            <span>{t(`${key}Q`)}</span>
            <span className="text-[#1D9E75]" aria-hidden>
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">−</span>
            </span>
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#6B7280]">
            {t(`${key}A`)}
          </p>
        </details>
      ))}
    </div>
  );
}
