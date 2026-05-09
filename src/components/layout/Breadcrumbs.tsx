"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type BreadcrumbItem = {
  label: string;
  href?: string | null;
};

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const t = useTranslations("breadcrumb");
  return (
    <nav
      aria-label={t("ariaNav")}
      className="mb-6 max-w-[100vw] overflow-x-auto"
    >
      <ol className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-2">
              {i > 0 ? (
                <span className="text-gray-400" aria-hidden>
                  /
                </span>
              ) : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="min-h-[44px] cursor-pointer whitespace-nowrap py-2 underline-offset-2 hover:text-brand-blue hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="min-h-[44px] py-2 font-semibold text-brand-blue whitespace-nowrap"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
