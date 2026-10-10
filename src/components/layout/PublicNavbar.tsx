"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
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
      <div className="relative mx-auto flex h-full w-full max-w-6xl items-center gap-2 px-4 safe-top sm:gap-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center justify-start">
          <Logo
            variant="light"
            size="sm"
            priority
            className="shrink-0 [&_img]:h-9 [&_img]:!w-auto [&_img]:max-h-9 [&_img]:min-h-0 sm:[&_img]:h-11 sm:[&_img]:max-h-11"
          />
        </div>

        <nav
          aria-label={t("mainNavigationAria")}
          className="hidden flex-1 items-center justify-center gap-8 lg:flex"
        >
          {items.map((it) => {
            const active = isActive(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors duration-150",
                  "text-[#6B7280] hover:text-[#0F4C75] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal",
                  active &&
                    "font-semibold text-[#0F4C75] underline decoration-[#1D9E75] decoration-2 underline-offset-8",
                )}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-3">
          <div className="shrink-0">
            <LanguageSwitcher tone="light" minimal />
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            {sessionLoading ? (
              <span className="inline-flex h-11 w-[9.5rem] animate-pulse rounded-lg bg-gray-100" aria-hidden />
            ) : isLoggedIn && dashboardHref ? (
              <>
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
                <Link href="/login">
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
            isActive={isActive}
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
  isActive,
}: {
  items: { href: string; label: string }[];
  isLoggedIn: boolean;
  dashboardHref: string | null;
  locale: string;
  isActive: (href: string) => boolean;
}) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 lg:hidden"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? t("closeSidebarAria") : t("mainMenuAria")}
      >
        {open ? <X className="h-5 w-5 text-gray-800" /> : <Menu className="h-5 w-5 text-gray-800" />}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-white safe-top lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 px-4">
            <span className="text-sm font-semibold text-[#0F4C75]">{t("mainMenuAria")}</span>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200"
              aria-label={t("closeSidebarAria")}
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav
            className="flex flex-1 flex-col gap-1 overflow-y-auto p-4 safe-bottom"
            aria-label={t("mainNavigationAria")}
          >
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "min-h-11 rounded-xl px-3 py-3 text-base font-semibold hover:bg-brand-lightBlue",
                  isActive(it.href) ? "text-[#0F4C75]" : "text-gray-800",
                )}
              >
                {it.label}
              </Link>
            ))}

            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t("language")}
              </p>
              <LanguageSwitcher tone="light" minimal className="px-3 [&_button]:w-full [&_button]:justify-center" />
            </div>

            <div className="mt-4 grid gap-2 pt-2">
              {isLoggedIn && dashboardHref ? (
                <>
                  <Link href={dashboardHref} onClick={() => setOpen(false)}>
                    <Button
                      variant="primary"
                      className="min-h-11 w-full bg-[#0F4C75] py-2.5 text-sm hover:bg-[#0D2137]"
                      size="sm"
                      type="button"
                    >
                      {t("dashboard")}
                    </Button>
                  </Link>
                  <button
                    type="button"
                    className="min-h-11 w-full rounded-lg border border-[#0F4C75] text-sm font-medium text-[#0F4C75]"
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
                  <Link href="/login" onClick={() => setOpen(false)}>
                    <Button
                      variant="outline"
                      className="min-h-11 w-full border border-[#0F4C75] px-3 text-sm text-[#0F4C75]"
                      size="sm"
                      type="button"
                    >
                      {t("login")}
                    </Button>
                  </Link>
                  <Link href={hrefRegisterFree} onClick={() => setOpen(false)}>
                    <Button
                      variant="primary"
                      className="min-h-11 w-full bg-[#0F4C75] py-2.5 text-sm hover:bg-[#0D2137]"
                      size="sm"
                      type="button"
                    >
                      {t("getStarted")}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
