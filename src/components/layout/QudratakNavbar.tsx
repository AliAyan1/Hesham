"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { BasalimEnArToggle } from "@/components/layout/BasalimEnArToggle";
import { QudratakLogo } from "@/components/layout/QudratakLogo";
import { PlatformCta } from "@/components/qudratak/PlatformCta";
import { QUDRAHTECH_MARKETING_PATH } from "@/lib/qudrahtech-marketing";
import { QudrahtechLoginUrl, QudrahtechRegisterUrl } from "@/lib/basalim-public";

type QudratakNavbarProps = {
  locale: string;
};

type NavItem = { href: string; labelEn: string; labelAr: string };

export function QudratakNavbar({ locale }: QudratakNavbarProps) {
  const isAr = locale === "ar";
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const loginUrl = QudrahtechLoginUrl(locale);
  const registerUrl = QudrahtechRegisterUrl(locale, { plan: "free" });

  const links: NavItem[] = useMemo(
    () => [
      { href: QUDRAHTECH_MARKETING_PATH, labelEn: "Home", labelAr: "الرئيسية" },
      { href: `${QUDRAHTECH_MARKETING_PATH}/about`, labelEn: "About", labelAr: "من نحن" },
      {
        href: `${QUDRAHTECH_MARKETING_PATH}/opportunities`,
        labelEn: "Opportunities",
        labelAr: "الفرص",
      },
      { href: `${QUDRAHTECH_MARKETING_PATH}/mentors`, labelEn: "Mentors", labelAr: "المرشدون" },
      { href: `${QUDRAHTECH_MARKETING_PATH}/pricing`, labelEn: "Pricing", labelAr: "التسعير" },
      { href: `${QUDRAHTECH_MARKETING_PATH}/contact`, labelEn: "Contact", labelAr: "تواصل" },
    ],
    [],
  );

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === QUDRAHTECH_MARKETING_PATH) {
      return pathname === QUDRAHTECH_MARKETING_PATH || pathname === `${QUDRAHTECH_MARKETING_PATH}/`;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const linkClass = (active: boolean) =>
    cn(
      "whitespace-nowrap text-sm font-medium transition-colors hover:text-[#C9A84C]",
      active ? "text-[#C9A84C]" : "text-white/85",
    );

  return (
    <header className="sticky top-0 z-50 bg-[#0D1F2D] text-white">
      <div className="hidden border-b border-white/5 lg:block">
        <div className="mx-auto flex max-w-7xl justify-end px-6 py-1.5">
          <Link href="/" className="text-xs font-medium text-white/50 transition-colors hover:text-white">
            {isAr ? "← باسالم كونسلتينج" : "← Basalim Consulting"}
          </Link>
        </div>
      </div>
      <div className="border-b border-white/10">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:h-[72px] md:px-6 lg:grid lg:grid-cols-[minmax(0,auto)_1fr_minmax(0,auto)] lg:gap-6">
        <QudratakLogo locale={locale} compact className="lg:min-w-[140px]" />

        <nav
          className="hidden items-center justify-center gap-x-4 xl:gap-x-5 lg:flex"
          aria-label="Qudratak"
        >
          {links.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(isActive(item.href))}>
              {isAr ? item.labelAr : item.labelEn}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-end gap-2 lg:flex lg:gap-3">
          <BasalimEnArToggle tone="dark" />
          <PlatformCta
            href={loginUrl}
            className="hidden whitespace-nowrap px-2 py-2 text-sm font-semibold text-white/85 hover:text-white xl:inline"
          >
            {isAr ? "تسجيل الدخول" : "Login"}
          </PlatformCta>
          <PlatformCta
            href={registerUrl}
            className="whitespace-nowrap rounded-md bg-[#C9A84C] px-4 py-2.5 text-sm font-semibold text-[#0D1F2D] hover:opacity-90"
          >
            {isAr ? "ابدأ الآن" : "Get Started"}
          </PlatformCta>
        </div>

        <button
          type="button"
          className="ms-auto inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#0D1F2D] lg:hidden">
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
            <QudratakLogo locale={locale} compact />
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-3 text-base font-medium",
                  isActive(item.href) ? "bg-white/10 text-[#C9A84C]" : "text-white",
                )}
                onClick={() => setMobileOpen(false)}
              >
                {isAr ? item.labelAr : item.labelEn}
              </Link>
            ))}
            <Link
              href="/"
              className="mt-4 rounded-lg border border-white/20 px-3 py-3 text-sm text-white/80"
              onClick={() => setMobileOpen(false)}
            >
              {isAr ? "← باسالم كونسلتينج" : "← Basalim Consulting"}
            </Link>
            <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6">
              <BasalimEnArToggle tone="dark" />
              <PlatformCta
                href={loginUrl}
                className="rounded-md border border-white/30 py-3 text-center text-sm font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                {isAr ? "تسجيل الدخول" : "Login"}
              </PlatformCta>
              <PlatformCta
                href={registerUrl}
                className="rounded-md bg-[#C9A84C] py-3 text-center text-sm font-semibold text-[#0D1F2D]"
                onClick={() => setMobileOpen(false)}
              >
                {isAr ? "ابدأ الآن" : "Get Started"}
              </PlatformCta>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
