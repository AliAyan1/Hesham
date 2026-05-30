"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ClearSessionButton } from "@/components/auth/ClearSessionButton";
import { signOutThenNavigate } from "@/lib/auth-redirect";
import { hrefRegisterFree } from "@/lib/i18n-hrefs";
import { dashboardPathForRole } from "@/lib/subscription";
import { UserRole } from "@/types";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Button } from "@/components/ui/Button";

type PublicNavbarProps = {
  locale: string;
  /**
   * Marketing pages (home, jobs, pricing): always Login + Get Started.
   * Ignores stale client session cookies so visitors never see Log out / Dashboard here.
   */
  guestOnly?: boolean;
};

function useScrollShadow(threshold = 6) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const onScroll = () => setOn(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return on;
}

export function PublicNavbar({ locale, guestOnly = false }: PublicNavbarProps): ReactNode {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const shadow = useScrollShadow(8);
  const isRtl = locale === "ar" || locale === "ur";
  const { data: session, status } = useSession();
  const sessionLoading = !guestOnly && status === "loading";
  const clientLoggedIn =
    status === "authenticated" &&
    Boolean(session?.user?.id) &&
    Boolean(session?.user?.email);
  const isLoggedIn = guestOnly ? false : clientLoggedIn;
  const dashboardHref =
    isLoggedIn && session?.user
      ? dashboardPathForRole(String(session.user.role ?? UserRole.JOBSEEKER))
      : null;

  const items = useMemo(
    () => [
      { href: "/", label: t("home") },
      { href: "/jobs", label: t("jobs") },
      { href: "/about", label: t("about") },
      { href: "/pricing", label: t("pricing") },
      { href: "/contact", label: t("contact") },
    ],
    [t],
  );

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header
      dir={isRtl ? "rtl" : "ltr"}
      className={cn(
        "sticky top-0 z-50 flex h-[68px] w-full border-b border-[#F3F4F6] bg-white/95 backdrop-blur-md transition-shadow duration-200",
        shadow ? "shadow-[0_4px_20px_rgba(15,23,42,0.06)]" : "shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
      )}
      role="banner"
    >
      <div className="relative mx-auto flex h-full w-full max-w-[100vw] items-center justify-between gap-3 px-6 lg:gap-4">
        <div className="flex min-h-0 min-w-0 items-center justify-start">
          <Logo
            variant="light"
            size="sm"
            priority
            className="shrink-0 [&_img]:h-11 [&_img]:!w-auto [&_img]:max-h-11 [&_img]:min-h-0"
          />
        </div>

        {/* Centered desktop nav — absolute row avoids grid col-start clashes that stacked links above the bar on some breakpoints. */}
        <nav
          aria-label={t("mainNavigationAria")}
          className="pointer-events-none absolute inset-x-0 top-1/2 z-[1] hidden max-h-11 max-w-[100vw] -translate-y-1/2 items-center justify-center gap-1 overflow-x-auto overscroll-x-contain px-6 sm:px-8 lg:flex lg:justify-center lg:gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {items.map((it) => {
            const active = isActive(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "pointer-events-auto inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors duration-150",
                  "text-gray-600 hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal",
                  active &&
                    "font-semibold text-brand-blue underline decoration-brand-teal decoration-2 underline-offset-8",
                )}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-h-0 min-w-0 items-center justify-end gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <LanguageSwitcher tone="light" minimal />
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            {sessionLoading ? (
              <span className="inline-flex h-11 w-[9.5rem] animate-pulse rounded-lg bg-gray-100" aria-hidden />
            ) : isLoggedIn && dashboardHref ? (
              <>
                <ClearSessionButton locale={locale} variant="button" />
                <button
                  type="button"
                  onClick={() => void signOutThenNavigate("/", locale)}
                  className="inline-flex h-11 min-h-0 items-center rounded-lg border border-[#0F4C75] px-3 text-sm font-medium text-[#0F4C75] transition-colors hover:bg-brand-lightBlue"
                >
                  {t("logout")}
                </button>
                <Link href={dashboardHref}>
                  <Button
                    variant="primary"
                    size="sm"
                    type="button"
                    className="h-11 min-h-0 bg-[#0F4C75] px-3 py-2 text-sm hover:bg-[#0D2137]"
                  >
                    {t("dashboard")}
                  </Button>
                </Link>
              </>
            ) : (
              <>
                {guestOnly ? (
                  <ClearSessionButton locale={locale} variant="link" className="hidden sm:inline-flex" />
                ) : (
                  <ClearSessionButton locale={locale} variant="button" />
                )}
                <Link href="/auth/login">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="h-11 min-h-0 border border-[#0F4C75] px-3 py-2 text-sm text-[#0F4C75] hover:bg-brand-lightBlue"
                  >
                    {t("login")}
                  </Button>
                </Link>
                <Link href={hrefRegisterFree}>
                  <Button
                    variant="primary"
                    size="sm"
                    type="button"
                    className="h-11 min-h-0 bg-[#0F4C75] px-3 py-2 text-sm hover:bg-[#0D2137]"
                  >
                    {t("getStarted")}
                  </Button>
                </Link>
              </>
            )}
          </div>

          <PublicMobileMenu
            items={items}
            isLoggedIn={isLoggedIn}
            dashboardHref={dashboardHref}
            locale={locale}
            guestOnly={guestOnly}
          />
        </div>
      </div>
    </header>
  );
}

function PublicMobileMenu({
  items,
  isLoggedIn,
  dashboardHref,
  locale,
  guestOnly,
}: {
  items: { href: string; label: string }[];
  isLoggedIn: boolean;
  dashboardHref: string | null;
  locale: string;
  guestOnly: boolean;
}) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <div className="relative lg:hidden">
      <button
        type="button"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t("mainMenuAria")}
      >
        <svg
          className="h-5 w-5 text-gray-800"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {open ? (
        <div
          className="absolute end-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-gray-100 bg-white p-3 shadow-xl"
          role="dialog"
          aria-modal="false"
        >
          <nav className="flex flex-col gap-1" aria-label={t("mainNavigationAria")}>
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="min-h-10 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 hover:bg-brand-lightBlue"
              >
                {it.label}
              </Link>
            ))}
          </nav>

          <div className="mt-2 border-t border-gray-100 pt-3">
            <LanguageSwitcher tone="light" minimal className="w-full [&_button]:w-full [&_button]:justify-center" />
            <div className="mt-3 grid gap-2">
              {guestOnly ? (
                <ClearSessionButton locale={locale} variant="link" className="mx-auto" />
              ) : (
                <ClearSessionButton locale={locale} variant="button" className="w-full" />
              )}
              {isLoggedIn && dashboardHref ? (
                <>
                  <Link href={dashboardHref} onClick={() => setOpen(false)}>
                    <Button
                      variant="primary"
                      className="h-9 min-h-0 w-full bg-[#0F4C75] py-2 text-sm hover:bg-[#0D2137]"
                      size="sm"
                      type="button"
                    >
                      {t("dashboard")}
                    </Button>
                  </Link>
                  <button
                    type="button"
                    className="h-9 w-full rounded-lg border border-[#0F4C75] text-sm font-medium text-[#0F4C75]"
                    onClick={() => {
                      setOpen(false);
                      void signOutThenNavigate("/", locale);
                    }}
                  >
                    {t("logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" onClick={() => setOpen(false)}>
                    <Button
                      variant="outline"
                      className="h-9 min-h-0 w-full border border-[#0F4C75] px-3 text-sm text-[#0F4C75]"
                      size="sm"
                      type="button"
                    >
                      {t("login")}
                    </Button>
                  </Link>
                  <Link href={hrefRegisterFree} onClick={() => setOpen(false)}>
                    <Button
                      variant="primary"
                      className="h-9 min-h-0 w-full bg-[#0F4C75] py-2 text-sm hover:bg-[#0D2137]"
                      size="sm"
                      type="button"
                    >
                      {t("getStarted")}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
