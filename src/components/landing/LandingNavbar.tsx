"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string };

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

export function LandingNavbar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const shadow = useScrollShadow(10);

  const items: NavItem[] = useMemo(
    () => [
      { href: "/", label: t("home") },
      { href: "/about", label: t("about") },
      { href: "/pricing", label: t("pricing") },
      { href: "/contact", label: t("contact") },
    ],
    [t],
  );

  const [mobileOpen, setMobileOpen] = useState(false);

  function scrollToPricing() {
    setMobileOpen(false);
    const el = document.getElementById("pricing");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header
      suppressHydrationWarning
      className={cn(
        "sticky top-0 z-50 w-full border-b border-[#F3F4F6] bg-white/90 backdrop-blur-md",
        shadow ? "shadow-[0_6px_30px_rgba(15,23,42,0.10)]" : "shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-6xl items-center px-6">
        <div className="flex w-[200px] shrink-0 items-center">
          <Logo size="md" priority className="shrink-0 [&_img]:h-12 [&_img]:w-auto" />
        </div>

        <nav
          className="hidden flex-1 items-center justify-center gap-8 lg:flex"
          aria-label={t("mainNavigationAria")}
        >
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "inline-flex h-11 items-center rounded-md px-3 text-sm font-medium text-[#6B7280] hover:text-[#0F4C75] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal",
                isActive(it.href) &&
                  "font-semibold text-[#0F4C75] underline decoration-[#1D9E75] decoration-2 underline-offset-8",
              )}
            >
              {it.label}
            </Link>
          ))}
        </nav>

        <div
          className="flex w-[200px] shrink-0 items-center justify-end gap-2 sm:gap-3"
          suppressHydrationWarning
        >
          <LanguageSwitcher tone="light" minimal />

          <Link
            href="/login"
            suppressHydrationWarning
            className="hidden h-11 items-center rounded-lg border border-[#0F4C75] px-3 text-sm font-semibold text-[#0F4C75] hover:bg-[#EFF6FF] sm:inline-flex"
          >
            {t("login")}
          </Link>

          <a
            href="#pricing"
            suppressHydrationWarning
            onClick={(e) => {
              e.preventDefault();
              scrollToPricing();
            }}
            className="hidden h-11 items-center rounded-lg bg-[#0F4C75] px-4 text-sm font-semibold text-white shadow-sm shadow-[#0F4C75]/20 hover:bg-[#0D2137] sm:inline-flex"
          >
            {t("getStarted")}
          </a>

          <button
            type="button"
            suppressHydrationWarning
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 lg:hidden"
            aria-label={t("mainMenuAria")}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <svg className="h-5 w-5 text-gray-900" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-gray-100 bg-white/95 px-6 py-4 lg:hidden">
          <div className="mx-auto max-w-6xl space-y-2">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold hover:bg-[#EFF6FF]",
                  isActive(it.href) ? "text-[#0F4C75]" : "text-gray-900",
                )}
              >
                {it.label}
              </Link>
            ))}

            <div className="grid gap-2 pt-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex min-h-11 items-center justify-center rounded-xl border border-[#0F4C75] text-sm font-semibold text-[#0F4C75]"
              >
                {t("login")}
              </Link>
              <a
                href="#pricing"
                suppressHydrationWarning
                onClick={(e) => {
                  e.preventDefault();
                  scrollToPricing();
                }}
                className="flex min-h-11 items-center justify-center rounded-xl bg-[#0F4C75] text-sm font-semibold text-white"
              >
                {t("getStarted")}
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

