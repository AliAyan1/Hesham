"use client";

import { useEffect } from "react";
import {
  Bell,
  Calendar,
  Clock,
  LayoutDashboard,
  Settings,
  Star,
  UserRound,
  Wallet,
  GraduationCap,
  MessageCircle,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import { useDashboardUI } from "@/components/layout/dashboard-ui";

const ROOT = "/dashboard/mentor";

const NAV = [
  { href: ROOT, labelKey: "dashboard", Icon: LayoutDashboard },
  { href: `${ROOT}/profile`, labelKey: "profile", Icon: UserRound },
  { href: `${ROOT}/sessions`, labelKey: "sessions", Icon: Calendar },
  { href: `${ROOT}/messages`, labelKey: "messages", Icon: MessageCircle },
  { href: `${ROOT}/availability`, labelKey: "availability", Icon: Clock },
  { href: `${ROOT}/earnings`, labelKey: "earnings", Icon: Wallet },
  { href: `${ROOT}/reviews`, labelKey: "reviews", Icon: Star },
  { href: `${ROOT}/notifications`, labelKey: "notifications", Icon: Bell },
  { href: `${ROOT}/settings`, labelKey: "settings", Icon: Settings },
] as const;

export function MentorSidebar({ locale }: { locale: string }) {
  const session = useSession();
  const pathname = usePathname();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useDashboardUI();
  const t = useTranslations("mentor");
  const tNav = useTranslations("nav");
  const tSide = useTranslations("sidebar");
  const isRtl = locale === "ar" || locale === "ur";

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  function isActive(href: string): boolean {
    if (href === ROOT) return pathname === ROOT;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {mobileSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 top-14 z-[29] bg-black/40 md:hidden"
          aria-label={tNav("closeSidebarAria")}
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          "fixed start-0 top-14 z-30 flex h-[calc(100vh-3.5rem)] w-64 shrink-0 flex-col overflow-y-auto bg-[#0D2137] text-white",
          "transition-transform duration-200 ease-out",
          mobileSidebarOpen ? "translate-x-0" : isRtl ? "translate-x-full" : "-translate-x-full",
          "md:translate-x-0",
        )}
        style={{ backgroundColor: "#0D2137" }}
      >
        <nav className="flex flex-1 flex-col p-4 pt-5" role="navigation">
          <div className="mb-4 flex items-center gap-2 px-2 text-[#C9973A]">
            <GraduationCap className="h-5 w-5" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-wide">{t("title")}</span>
          </div>
          {NAV.map((item) => {
            const on = isActive(item.href);
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "mb-1 flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  on ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={session.data?.user?.image ?? null}
              name={session.data?.user?.name ?? null}
              email={session.data?.user?.email ?? "mentor@qudrahtech.com"}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{session.data?.user?.name ?? "—"}</p>
              <span className="mt-1 inline-block rounded-full bg-[#C9973A]/20 px-2 py-0.5 text-[10px] font-bold text-[#FDE68A]">
                {t("title")}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: `/${locale}/auth/login` })}
            className="mt-3 w-full rounded-lg border border-white/20 py-2 text-xs font-medium text-white/80 hover:bg-white/5"
          >
            {tNav("logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
