"use client";

import { useTranslations } from "next-intl";

type BrandLogoTextProps = {
  /** Navy page background (#0F4C75): default blue tone is invisible; use contrast colors. */
  variant?: "default" | "onPrimary";
};

/** Two-tone brand line used in Navbar and auth screens. */
export function BrandLogoText({ variant = "default" }: BrandLogoTextProps) {
  const t = useTranslations("nav");
  const primaryClass =
    variant === "onPrimary"
      ? "font-extrabold text-white drop-shadow-sm"
      : "font-extrabold text-brand-blue";
  const accentClass =
    variant === "onPrimary"
      ? "font-extrabold text-brand-teal drop-shadow-sm"
      : "font-extrabold text-brand-teal";

  const start = t("brandStart").trim();
  const end = t("brandEnd").trim();
  if (start.length > 0 && end.length > 0) {
    return (
      <>
        <span className={primaryClass}>{start}</span>
        <span className={accentClass}>{end}</span>
      </>
    );
  }
  return (
    <>
      <span className={primaryClass}>{t("brandQudrah")}</span>
      <span className={accentClass}>{t("brandTech")}</span>
    </>
  );
}
