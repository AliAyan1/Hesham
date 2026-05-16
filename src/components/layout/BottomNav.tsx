"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { UserRole } from "@/types";
import { cn } from "@/lib/cn";

export type BottomNavProps = {
  locale: string;
  role: UserRole;
};

type NavDef = {
  href: string;
  labelKey: string;
  emoji: string;
};

function dashboardRoot(role: UserRole): string {
  switch (role) {
    case "JOBSEEKER":
      return "/dashboard/job-seeker";
    case "EMPLOYER":
      return "/dashboard/employer";
    case "ADMIN":
      return "/dashboard/admin";
    default:
      return "/dashboard/job-seeker";
  }
}

function picks(role: UserRole): NavDef[] {
  switch (role) {
    case "JOBSEEKER":
      return [
        { href: "/dashboard/job-seeker", labelKey: "jobSeeker.dashboard", emoji: "🏠" },
        { href: "/dashboard/job-seeker/jobs", labelKey: "jobSeeker.jobs", emoji: "💼" },
        {
          href: "/dashboard/job-seeker/applications",
          labelKey: "jobSeeker.applications",
          emoji: "📋",
        },
        { href: "/dashboard/job-seeker/messages", labelKey: "jobSeeker.messages", emoji: "💬" },
        { href: "/dashboard/job-seeker/profile", labelKey: "jobSeeker.profile", emoji: "👤" },
        {
          href: "/dashboard/job-seeker/notifications",
          labelKey: "jobSeeker.notifications",
          emoji: "🔔",
        },
      ];
    case "EMPLOYER":
      return [
        { href: "/dashboard/employer", labelKey: "employer.dashboard", emoji: "🏠" },
        { href: "/dashboard/employer/post-job", labelKey: "employer.postJob", emoji: "📢" },
        { href: "/dashboard/employer/candidates", labelKey: "employer.candidates", emoji: "👥" },
        { href: "/dashboard/employer/interviews", labelKey: "employer.aiInterviews", emoji: "🎬" },
        { href: "/dashboard/employer/talent-pool", labelKey: "employer.recruitingTalentPool", emoji: "📑" },
        { href: "/dashboard/employer/messages", labelKey: "employer.messages", emoji: "💬" },
        {
          href: "/dashboard/employer/notifications",
          labelKey: "employer.notifications",
          emoji: "🔔",
        },
      ];
    case "ADMIN":
      return [
        { href: "/dashboard/admin", labelKey: "admin.dashboard", emoji: "🏠" },
        { href: "/dashboard/admin/users", labelKey: "admin.users", emoji: "👥" },
        { href: "/dashboard/admin/jobs", labelKey: "admin.jobs", emoji: "💼" },
        { href: "/dashboard/admin/assessments", labelKey: "admin.assessments", emoji: "🧠" },
        { href: "/dashboard/admin/settings", labelKey: "admin.settings", emoji: "⚙️" },
      ];
    default:
      return [];
  }
}

export function BottomNav({ locale: _locale, role }: BottomNavProps) {
  void _locale;
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const tNav = useTranslations("nav");
  const root = dashboardRoot(role);
  const nav = picks(role);

  function active(href: string): boolean {
    if (href === root) return pathname === root;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label={tNav("mobileDashboardNav")}
      className="fixed bottom-0 start-0 end-0 z-40 grid border-t border-[#F1F5F9] bg-white pb-[env(safe-area-inset-bottom)] md:hidden shadow-[0_-4px_20px_rgba(15,23,42,0.06)]"
      style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
    >
      {nav.map((item) => {
        const on = active(item.href);
        const label = t(item.labelKey as never);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 px-1 pt-2 text-[10px] font-medium transition-colors active:bg-gray-50",
              on ? "text-brand-teal" : "text-gray-700",
            )}
          >
            <span className="text-lg leading-none" aria-hidden>
              {item.emoji}
            </span>
            <span className="line-clamp-2 max-w-[5rem] text-center leading-[1.1]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
