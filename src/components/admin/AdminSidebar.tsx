"use client";

import {
  BarChart3,
  Briefcase,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { signOutToLanding } from "@/lib/auth-redirect";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "@/components/ui/Logo";
import { InitialsAvatar } from "@/components/dashboard/InitialsAvatar";
import { cn } from "@/lib/cn";

type NavItem = { href: string; labelKey: string; Icon: typeof LayoutDashboard };

const SECTIONS: { titleKey: string; items: NavItem[] }[] = [
  {
    titleKey: "overview",
    items: [
      { href: "/dashboard/admin", labelKey: "dashboard", Icon: LayoutDashboard },
      { href: "/dashboard/admin/analytics", labelKey: "analytics", Icon: BarChart3 },
    ],
  },
  {
    titleKey: "users",
    items: [
      { href: "/dashboard/admin/users/job-seekers", labelKey: "jobSeekers", Icon: Users },
      { href: "/dashboard/admin/users/employers", labelKey: "employers", Icon: Users },
      { href: "/dashboard/admin/users/mentors", labelKey: "mentors", Icon: Users },
    ],
  },
  {
    titleKey: "platform",
    items: [
      { href: "/dashboard/admin/jobs", labelKey: "jobs", Icon: Briefcase },
      { href: "/dashboard/admin/assessments", labelKey: "assessments", Icon: ClipboardList },
      { href: "/dashboard/admin/interviews", labelKey: "interviews", Icon: FileText },
      { href: "/dashboard/admin/talent-pool", labelKey: "talentPool", Icon: Users },
    ],
  },
  {
    titleKey: "finance",
    items: [
      { href: "/dashboard/admin/revenue", labelKey: "revenue", Icon: Wallet },
      { href: "/dashboard/admin/subscriptions", labelKey: "subscriptions", Icon: CreditCard },
      { href: "/dashboard/admin/payouts", labelKey: "payouts", Icon: CreditCard },
    ],
  },
  {
    titleKey: "system",
    items: [
      { href: "/dashboard/admin/cms", labelKey: "content", Icon: FileText },
      { href: "/dashboard/admin/audit-logs", labelKey: "auditLogs", Icon: Shield },
      { href: "/dashboard/admin/settings", labelKey: "settings", Icon: Settings },
    ],
  },
];

export function AdminSidebar({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const t = useTranslations("adminPanel");
  const locale = useLocale();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard/admin") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      className="fixed inset-y-0 start-0 z-40 flex w-[240px] flex-col bg-[#0D2137] text-white md:sticky md:top-0 md:h-screen"
      aria-label={t("sidebarAria")}
    >
      <div className="border-b border-white/10 px-4 py-5">
        <Logo variant="dark" size="sm" href="/dashboard/admin" className="brightness-0 invert" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {SECTIONS.map((section) => (
          <div key={section.titleKey} className="mb-5">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-white/50">
              {t(`sections.${section.titleKey}`)}
            </p>
            <ul className="space-y-0.5">
              {section.items.map(({ href, labelKey, Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive(href)
                        ? "bg-white/15 text-white"
                        : "text-white/75 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    {t(`nav.${labelKey}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3">
          <InitialsAvatar name={userName} email={userEmail} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="truncate text-xs text-white/60">{userEmail}</p>
            <span className="mt-1 inline-block rounded bg-[#1D9E75]/30 px-2 py-0.5 text-[10px] font-bold text-[#7ee8c8]">
              {t("superAdminBadge")}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOutToLanding(locale)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {t("logout")}
        </button>
      </div>
    </aside>
  );
}
