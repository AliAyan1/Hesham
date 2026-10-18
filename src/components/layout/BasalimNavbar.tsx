"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { BasalimLogo } from "@/components/layout/BasalimLogo";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { BasalimEnArToggle } from "@/components/layout/BasalimEnArToggle";
import { BookConsultationButton } from "@/components/basalim/BookConsultationButton";
import { JoinQudrahtechButton } from "@/components/basalim/JoinQudrahtechButton";
import {
  qudratakMarketingHref,
  QUDRAH_PLATFORM_NAME,
  QUDRAH_PLATFORM_NAME_AR,
} from "@/lib/basalim-public";
import { MobileMenuPortal } from "@/components/ui/MobileMenuPortal";

type BasalimNavbarProps = {
  locale: string;
};

type NavLink = {
  href: string;
  labelEn: string;
  labelAr: string;
  external?: boolean;
};

type ServiceItem = {
  href: string;
  labelEn: string;
  labelAr: string;
};

const SERVICE_ITEMS: ServiceItem[] = [
  {
    href: "/services/organizational-development",
    labelEn: "Organization Development",
    labelAr: "التطوير التنظيمي",
  },
  {
    href: "/services/talent-acquisition",
    labelEn: "Talent Acquisition & Recruitment",
    labelAr: "التوظيف والاستقطاب",
  },
  {
    href: "/services/learning-development",
    labelEn: "Learning & Development",
    labelAr: "التعلم والتطوير",
  },
  {
    href: "/services/leadership-development",
    labelEn: "Leadership Development",
    labelAr: "تطوير القيادات",
  },
  {
    href: "/services/hospitality-tourism",
    labelEn: "Hospitality & Tourism",
    labelAr: "حلول الضيافة والسياحة",
  },
  {
    href: "/services/people-function",
    labelEn: "Build Your People Function",
    labelAr: "بناء وظيفة الموارد البشرية",
  },
  {
    href: "/services/hr-advisory",
    labelEn: "HR Advisory",
    labelAr: "الاستشارات الاستراتيجية",
  },
];

function useScrollShadow(threshold = 8) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const onScroll = () => setOn(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return on;
}

export function BasalimNavbar({ locale }: BasalimNavbarProps) {
  const isAr = locale === "ar";
  const pathname = usePathname();
  const shadow = useScrollShadow(10);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [navReady, setNavReady] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNavReady(true);
  }, []);

  const navLinks: NavLink[] = useMemo(
    () => [
      { href: "/", labelEn: "Home", labelAr: "الرئيسية" },
      { href: "/about", labelEn: "About", labelAr: "من نحن" },
      { href: "/industries", labelEn: "Industries", labelAr: "القطاعات" },
      {
        href: qudratakMarketingHref(),
        labelEn: QUDRAH_PLATFORM_NAME,
        labelAr: QUDRAH_PLATFORM_NAME_AR,
      },
      { href: "/insights", labelEn: "Insights", labelAr: "المعرفة" },
      { href: "/contact", labelEn: "Contact", labelAr: "تواصل معنا" },
    ],
    [],
  );

  useEffect(() => {
    if (!servicesOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!servicesRef.current?.contains(e.target as Node)) setServicesOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [servicesOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const servicesActive = navReady && pathname.startsWith("/services");

  const linkActive = (href: string) => navReady && isActive(href);

  const linkClass = (active: boolean) =>
    cn(
      "relative px-1 py-2 text-sm font-medium transition-colors hover:text-[#1A6B5A]",
      active ? "text-[#1A6B5A]" : "text-[#0D1F2D]",
    );

  const activeBar = (
    <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[#1A6B5A]" aria-hidden />
  );

  const servicesLabel = isAr ? "الخدمات" : "Services";

  return (
    <>
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md transition-shadow",
        shadow ? "shadow-md" : "shadow-sm",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 safe-top sm:gap-4 sm:px-4 md:h-[72px] md:px-6 lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-8">
        <div className="flex min-w-0 flex-1 items-center lg:flex-none lg:min-w-0">
          <Link href="/" className="inline-flex min-w-0 items-center" onClick={() => setMobileOpen(false)}>
            <BasalimLogo compact priority className="max-w-[128px] sm:max-w-[168px]" />
          </Link>
        </div>

        <nav className="hidden items-center justify-center gap-5 lg:flex" aria-label="Main">
          {navLinks.slice(0, 2).map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(linkActive(item.href))}>
              {linkActive(item.href) ? activeBar : null}
              {isAr ? item.labelAr : item.labelEn}
            </Link>
          ))}

          <div ref={servicesRef} className="relative">
            <button
              type="button"
              className={cn(linkClass(servicesActive), "inline-flex items-center gap-1")}
              aria-expanded={servicesOpen}
              onClick={() => setServicesOpen((v) => !v)}
              onMouseEnter={() => setServicesOpen(true)}
            >
              {servicesActive ? activeBar : null}
              {servicesLabel}
              <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
            </button>
            {servicesOpen ? (
              <ul
                className="absolute start-0 top-full z-50 mt-2 min-w-[260px] rounded-lg border border-gray-100 bg-white py-2 shadow-xl"
                onMouseLeave={() => setServicesOpen(false)}
              >
                {SERVICE_ITEMS.map((s) => (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      className="block px-4 py-2.5 text-sm text-[#0D1F2D] transition-colors hover:bg-[#F5F3EE] hover:text-[#1A6B5A]"
                      onClick={() => setServicesOpen(false)}
                    >
                      {isAr ? s.labelAr : s.labelEn}
                    </Link>
                  </li>
                ))}
                <li className="border-t border-gray-100 mt-1 pt-1">
                  <Link
                    href="/services"
                    className="block px-4 py-2.5 text-sm font-semibold text-[#1A6B5A]"
                    onClick={() => setServicesOpen(false)}
                  >
                    {isAr ? "جميع الخدمات" : "All services"}
                  </Link>
                </li>
              </ul>
            ) : null}
          </div>

          {navLinks.slice(2).map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass(false)}
              >
                {isAr ? item.labelAr : item.labelEn}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className={linkClass(linkActive(item.href))}>
                {linkActive(item.href) ? activeBar : null}
                {isAr ? item.labelAr : item.labelEn}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden items-center justify-end gap-2 xl:gap-3 lg:flex">
          <BasalimEnArToggle />
          <JoinQudrahtechButton variant="header" className="min-h-0 whitespace-nowrap" />
          <BookConsultationButton variant="header" className="min-h-0 whitespace-nowrap" />
        </div>

        <div className="ms-auto flex items-center gap-2 lg:hidden">
          <BasalimEnArToggle />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-[#0D1F2D]"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

    </header>

    <MobileMenuPortal open={mobileOpen}>
        <div className="fixed inset-0 z-[100] flex flex-col bg-white safe-top lg:hidden">
          <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
            <Link href="/" onClick={() => setMobileOpen(false)}>
              <BasalimLogo compact />
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4" aria-label="Mobile">
            {navLinks.map((item) =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg px-3 py-3 text-base font-medium text-[#0D1F2D]"
                  onClick={() => setMobileOpen(false)}
                >
                  {isAr ? item.labelAr : item.labelEn}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-3 text-base font-medium",
                    linkActive(item.href) ? "bg-[#F5F3EE] text-[#1A6B5A]" : "text-[#0D1F2D]",
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {isAr ? item.labelAr : item.labelEn}
                </Link>
              ),
            )}
            <p className="mt-2 px-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              {servicesLabel}
            </p>
            {SERVICE_ITEMS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-lg px-3 py-2.5 text-sm text-[#374151]"
                onClick={() => setMobileOpen(false)}
              >
                {isAr ? s.labelAr : s.labelEn}
              </Link>
            ))}
            <div className="mt-6 flex flex-col gap-3 border-t pt-6">
              <BasalimEnArToggle className="self-start" />
              <JoinQudrahtechButton
                className="w-full"
                onClick={() => setMobileOpen(false)}
              />
              <BookConsultationButton className="w-full" />
            </div>
          </nav>
        </div>
    </MobileMenuPortal>
    </>
  );
}
