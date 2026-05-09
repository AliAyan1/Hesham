"use client";

import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Logo } from "@/components/ui/Logo";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { dashboardProfilePath } from "@/lib/dashboard-nav";
import { DASHBOARD_ROUTES } from "@/lib/constants";
import { cn } from "@/lib/cn";
import type { Session } from "next-auth";
import type { UserRole } from "@/types";

type NavbarProps = {
  locale: string;
  variant?: "public" | "dashboard";
};

function dashboardPathForRole(role: UserRole): string {
  return DASHBOARD_ROUTES[role];
}

function dashboardHref(session: Session | null): string | undefined {
  if (!session?.user?.role) return undefined;
  return dashboardPathForRole(session.user.role);
}

function NavLinks({
  pathname,
  dash,
  homeLabel,
  jobsLabel,
  dashboardLabel,
  mainNavAria,
}: {
  pathname: string;
  dash: string | undefined;
  homeLabel: string;
  jobsLabel: string;
  dashboardLabel: string;
  mainNavAria: string;
}) {
  const item = (href: string, label: string) => {
    const active =
      href === "/"
        ? pathname === "/" || pathname === ""
        : pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal",
          active
            ? "text-brand-teal underline decoration-brand-teal decoration-2 underline-offset-8"
            : "text-gray-700 hover:text-gray-900",
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-2 lg:gap-6"
      aria-label={mainNavAria}
    >
      {item("/", homeLabel)}
      {item("/jobs", jobsLabel)}
      {dash ? item(dash, dashboardLabel) : null}
    </nav>
  );
}

export function Navbar({ locale, variant = "public" }: NavbarProps): ReactNode {
  const session = useSession();
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isRtl = locale === "ar" || locale === "ur";
  const dash = dashboardHref(session.data ?? null);
  const userRole = session.data?.user?.role as UserRole | undefined;

  const authenticated =
    session.status === "authenticated" &&
    session.data?.user?.email !== undefined &&
    typeof session.data.user.email === "string";

  return (
    <header
      dir={isRtl ? "rtl" : "ltr"}
      className={cn(
        "sticky top-0 z-40 w-full overflow-visible border-b border-[#E5E7EB] bg-white transition-shadow duration-200",
        variant === "dashboard" && "shadow-[0_1px_3px_rgba(15,23,42,0.06)]",
      )}
      role="banner"
    >
      <div className="relative mx-auto flex max-w-[100vw] items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="relative z-10 shrink-0 text-xl font-bold tracking-tight"
          aria-label={t("home")}
        >
          <Logo variant="light" size="sm" className="max-w-[160px]" priority />
        </Link>

        {/* True viewport-centered nav: grid 1fr/auto/1fr shifts when logo vs actions min-widths differ */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1] hidden -translate-x-1/2 -translate-y-1/2 lg:block">
          <div className="pointer-events-auto">
            <NavLinks
              pathname={pathname}
              dash={dash}
              homeLabel={t("home")}
              jobsLabel={t("jobs")}
              dashboardLabel={t("dashboard")}
              mainNavAria={t("mainNavigationAria")}
            />
          </div>
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-2 overflow-visible lg:gap-3">
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>
          {authenticated ? <NotificationBell locale={locale} /> : null}
          {authenticated &&
          variant === "dashboard" &&
          userRole !== undefined &&
          typeof session.data?.user?.email === "string" ? (
            <div className="hidden lg:block">
              <DashboardUserMenu
                locale={locale}
                email={session.data.user.email}
                name={session.data.user.name ?? null}
                image={session.data.user.image ?? null}
                profileHref={dashboardProfilePath(userRole)}
              />
            </div>
          ) : authenticated ? (
            <Link
              href={dash ?? "/dashboard"}
              className="hidden min-h-11 min-w-11 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal lg:inline-flex"
              aria-label={t("profile")}
            >
              <Avatar
                src={session.data?.user?.image ?? null}
                name={session.data?.user?.name ?? null}
                email={session.data.user.email as string}
                size="md"
                className="ring-2 ring-brand-teal ring-offset-2 ring-offset-white"
              />
            </Link>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Link href="/auth/login">
                <Button variant="outline" size="sm" type="button">
                  {t("login")}
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="primary" size="sm" type="button">
                  {t("register")}
                </Button>
              </Link>
            </div>
          )}
          <MobileNavbar locale={locale} dash={dash} authenticated={!!authenticated} />
        </div>
      </div>
      <div className="flex justify-center pb-3 lg:hidden">
        <LanguageSwitcher />
      </div>
      <div className="flex w-full flex-col items-stretch border-t border-gray-100 px-2 pb-3 lg:hidden">
        <NavLinks
          pathname={pathname}
          dash={dash}
          homeLabel={t("home")}
          jobsLabel={t("jobs")}
          dashboardLabel={t("dashboard")}
          mainNavAria={t("mainNavigationAria")}
        />
        {!authenticated ? (
          <div className="mt-4 flex gap-3 px-1">
            <Link href="/auth/login" className="flex-1">
              <Button variant="outline" className="w-full" size="md" type="button">
                {t("login")}
              </Button>
            </Link>
            <Link href="/auth/register" className="flex-1">
              <Button variant="primary" className="w-full" size="md" type="button">
                {t("register")}
              </Button>
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function DashboardUserMenu({
  locale,
  email,
  name,
  image,
  profileHref,
}: {
  locale: string;
  email: string;
  name: string | null;
  image: string | null;
  profileHref: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);
  const t = useTranslations("nav");
  const tSide = useTranslations("sidebar");

  const trimmed = name?.trim();
  const displayName =
    trimmed && trimmed.length > 0 ? trimmed : (email.split("@")[0] ?? email);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex max-w-full min-h-11 items-center gap-2 rounded-full border border-gray-200 bg-white ps-1 pe-2 shadow-sm",
          "hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${tSide("userMenuAria")}: ${displayName}`}
      >
        <Avatar
          src={image}
          name={name}
          email={email}
          size="md"
          className="ring-2 ring-brand-teal ring-offset-2 ring-offset-white"
        />
        <span className="hidden min-w-0 max-w-[140px] flex-col items-start text-start sm:flex md:max-w-[180px]">
          <span className="truncate text-sm font-semibold text-gray-900">{displayName}</span>
          {trimmed ? (
            <span className="truncate text-xs text-gray-500" title={email}>
              {email}
            </span>
          ) : null}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 rtl:rotate-180" aria-hidden />
      </button>
      {open ? (
        <div
          className="absolute end-0 top-full z-[100] mt-2 min-w-[13rem] rounded-xl border border-gray-100 bg-white py-2 shadow-xl"
          role="menu"
        >
          <Link
            href={profileHref}
            className="flex min-h-11 items-center px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            {t("profile")}
          </Link>
          <button
            type="button"
            className="flex min-h-11 w-full items-center px-4 py-2 text-start text-sm font-medium text-red-600 hover:bg-red-50"
            role="menuitem"
            onClick={() => {
              void signOut({ callbackUrl: `/${locale}/auth/login` });
            }}
          >
            {t("logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MobileNavbar({
  locale,
  dash,
  authenticated,
}: {
  locale: string;
  dash?: string;
  authenticated: boolean;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");

  return (
    <div className="relative lg:hidden">
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobile-navbar-sheet"
        aria-label={t("mainMenuAria")}
      >
        <span className="sr-only">{t("mainMenuAria")}</span>
        <svg className="h-6 w-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open ? (
        <div
          id="mobile-navbar-sheet"
          className="absolute end-0 top-full z-50 mt-2 w-[min(100vw-2rem,20rem)] rounded-xl border border-gray-100 bg-white p-4 shadow-lg"
          role="dialog"
          aria-modal="false"
          aria-labelledby="mobile-sheet-title"
        >
          <p id="mobile-sheet-title" className="sr-only">
            {t("dashboard")}
          </p>
          <nav className="flex flex-col gap-2" aria-label={`${t("dashboard")}-${locale}`}>
            <Link href="/" onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-3 py-3 hover:bg-brand-lightBlue">
              {t("home")}
            </Link>
            <Link href="/jobs" onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-3 py-3 hover:bg-brand-lightBlue">
              {t("jobs")}
            </Link>
            {authenticated && dash ? (
              <Link href={dash} onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-3 py-3 hover:bg-brand-lightBlue">
                {t("dashboard")}
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
