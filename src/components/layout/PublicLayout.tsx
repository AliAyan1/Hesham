import type { ReactNode } from "react";
import { BasalimNavbar } from "@/components/layout/BasalimNavbar";
import { BasalimFooter } from "@/components/layout/BasalimFooter";
import { QudratakNavbar } from "@/components/layout/QudratakNavbar";

type PublicLayoutProps = {
  children: ReactNode;
  locale: string;
  /** Use Qudratak sub-nav on marketing pages under /qudratak. */
  variant?: "basalim" | "qudratak";
};

export function PublicLayout({ children, locale, variant = "basalim" }: PublicLayoutProps) {
  const isRTL = locale === "ar" || locale === "ur";
  const isQudratak = variant === "qudratak";

  return (
    <div
      className="min-h-screen bg-white text-[#0D1F2D] antialiased"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {isQudratak ? <QudratakNavbar locale={locale} /> : <BasalimNavbar locale={locale} />}
      <main>{children}</main>
      <BasalimFooter locale={locale} />
    </div>
  );
}
