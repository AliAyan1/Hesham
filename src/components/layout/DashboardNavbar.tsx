"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import type { Session } from "next-auth";
import type { UserRole } from "@/types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Avatar } from "@/components/ui/Avatar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import {
  dashboardProfilePath,
  dashboardSettingsPath,
} from "@/lib/dashboard-nav";
import { DASHBOARD_ROUTES } from "@/lib/constants";
import { useDashboardUI } from "@/components/layout/dashboard-ui";
import { ClearSessionButton } from "@/components/auth/ClearSessionButton";
import { ChevronDown, Menu, Search } from "lucide-react";

type DashboardNavbarProps = {
  locale: string;
};

function dashboardPathForRole(role: UserRole): string {
  return DASHBOARD_ROUTES[role];
}

function dashboardHref(session: Session | null): string | undefined {
  if (!session?.user?.role) return undefined;
  return dashboardPathForRole(session.user.role);
}

export function DashboardNavbar({ locale }: DashboardNavbarProps): ReactNode {
  const session = useSession();
  const t = useTranslations("nav");
  const tSide = useTranslations("sidebar");
  const isRtl = locale === "ar" || locale === "ur";
  const { toggleMobileSidebar } = useDashboardUI();

  const authenticated =
    session.status === "authenticated" &&
    session.data?.user?.email !== undefined &&
    typeof session.data.user.email === "string";

  const dash = dashboardHref(session.data ?? null);
  const userRole = session.data?.user?.role as UserRole | undefined;

  const searchPh = t("dashboardSearchPlaceholder");

  const menuPaths = useMemo(() => {
    if (!userRole) return { profile: "", settings: "", showSettings: false };
    const profile = dashboardProfilePath(userRole);
    const settings = dashboardSettingsPath(userRole);
    return { profile, settings, showSettings: profile !== settings };
  }, [userRole]);

  return (
    <header
      dir={isRtl ? "rtl" : "ltr"}
      className={cn(
        "sticky top-0 z-40 flex h-14 w-full items-center overflow-visible border-b border-[#F3F4F6] bg-white",
        "shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
      )}
      role="banner"
    >
      <div className="mx-auto flex h-14 w-full max-w-[100vw] items-center gap-4 px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 md:hidden"
            aria-label={t("openSidebarAria")}
            onClick={toggleMobileSidebar}
          >
            <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
          <Logo
            variant="light"
            size="sm"
            className="shrink-0 [&_img]:h-9 [&_img]:!w-auto [&_img]:max-h-9 [&_img]:min-h-0"
            priority
          />
        </div>

        <div className="flex min-w-0 flex-1 justify-center px-2 sm:px-4">
          <label className="relative w-full min-w-0 max-w-full sm:max-w-md md:max-w-lg lg:max-w-2xl">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              strokeWidth={2}
              aria-hidden
            />
            <input
              type="search"
              name="dashboard-search"
              placeholder={searchPh}
              className="min-h-10 w-full rounded-lg border border-gray-200 bg-[#F8FAFC] py-2.5 ps-10 pe-3 text-sm leading-normal text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
              aria-label={searchPh}
              autoComplete="off"
            />
          </label>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {authenticated ? <NotificationBell locale={locale} compact /> : null}

          <LanguageSwitcher tone="light" minimal />

          {authenticated || dash ? (
            <span className="h-4 w-px shrink-0 bg-gray-200" aria-hidden />
          ) : null}

          {authenticated && userRole !== undefined && session.data?.user?.email ? (
            <DashboardUserMenu
              locale={locale}
              email={session.data.user.email}
              name={session.data.user.name ?? null}
              image={session.data.user.image ?? null}
              profileHref={menuPaths.profile}
              settingsHref={menuPaths.settings}
              showSettings={menuPaths.showSettings}
              ariaLabel={tSide("userMenuAria")}
              profileLabel={t("profile")}
              settingsLabel={t("settings")}
              logoutLabel={t("logout")}
            />
          ) : dash ? (
            <Link
              href={dash}
              className="hidden h-8 shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal sm:inline-flex"
              aria-label={t("profile")}
            >
              <Avatar
                src={session.data?.user?.image ?? null}
                name={session.data?.user?.name ?? null}
                email={(session.data?.user?.email as string) ?? ""}
                size="sm"
                className="ring-2 ring-brand-teal ring-offset-1 ring-offset-white"
              />
            </Link>
          ) : null}
        </div>
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
  settingsHref,
  showSettings,
  ariaLabel,
  profileLabel,
  settingsLabel,
  logoutLabel,
}: {
  locale: string;
  email: string;
  name: string | null;
  image: string | null;
  profileHref: string;
  settingsHref: string;
  showSettings: boolean;
  ariaLabel: string;
  profileLabel: string;
  settingsLabel: string;
  logoutLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);

  const trimmed = name?.trim();
  const displayName =
    trimmed && trimmed.length > 0 ? trimmed : (email.split("@")[0] ?? email);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
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
          "inline-flex h-9 max-w-full items-center gap-2 rounded-lg py-0 ps-0.5 pe-2",
          "border border-gray-200 bg-white text-gray-900 shadow-sm hover:border-gray-300",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${displayName}`}
      >
        <Avatar
          src={image}
          name={name}
          email={email}
          size="sm"
          className="ring-2 ring-brand-teal ring-offset-1 ring-offset-white"
        />
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-gray-900 lg:inline">
          {displayName}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-500 rtl:rotate-180" aria-hidden />
      </button>

      {open ? (
        <div
          className="absolute end-0 top-[calc(100%+6px)] z-[100] min-w-[12rem] rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl"
          role="menu"
        >
          <Link
            href={profileHref}
            className="flex min-h-10 items-center px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            {profileLabel}
          </Link>
          {showSettings ? (
            <Link
              href={settingsHref}
              className="flex min-h-10 items-center px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              {settingsLabel}
            </Link>
          ) : null}
          <div className="my-1 h-px bg-gray-100" role="presentation" />
          <div className="px-3 py-2" role="none">
            <ClearSessionButton locale={locale} variant="button" className="w-full" />
          </div>
          <div className="my-1 h-px bg-gray-100" role="presentation" />
          <button
            type="button"
            className="flex min-h-10 w-full items-center px-4 py-2 text-start text-sm font-medium text-red-600 hover:bg-red-50"
            role="menuitem"
            onClick={() => void signOut({ callbackUrl: `/${locale}/auth/login` })}
          >
            {logoutLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
