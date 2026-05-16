"use client";

import { useEffect } from "react";
import {
  BarChart3,
  Bell,
  Brain,
  Briefcase,
  ClipboardList,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Bookmark,
  Clapperboard,
  LineChart,
  Megaphone,
  MessageCircle,
  Settings,
  Sparkles,
  UserRound,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { SubscriptionTier, type UserRole } from "@/types";

import { cn } from "@/lib/cn";
import { hasAccess } from "@/lib/subscription";
import { Avatar } from "@/components/ui/Avatar";
import { useDashboardUI } from "@/components/layout/dashboard-ui";

export type SidebarProps = {
  locale: string;
  role: UserRole;
};

type LabelKey =
  | "dashboard"
  | "profile"
  | "cv"
  | "jobs"
  | "applications"
  | "invites"
  | "assessment"
  | "interview"
  | "messages"
  | "aiInterviews"
  | "recruitingTalentPool"
  | "talentPool"
  | "mentors"
  | "notifications"
  | "postJob"
  | "candidates"
  | "analytics"
  | "assessments"
  | "settings"
  | "users"
  | "revenue";

type NavItem = { href: string; labelKey: LabelKey; Icon: LucideIcon };

type NavGroup = { sectionKey?: string; items: NavItem[] };

const ICON: Record<LabelKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  profile: UserRound,
  cv: FolderKanban,
  jobs: Briefcase,
  applications: ClipboardList,
  invites: ClipboardList,
  assessment: Sparkles,
  interview: Video,
  messages: MessageCircle,
  aiInterviews: Clapperboard,
  recruitingTalentPool: Bookmark,
  talentPool: Users,
  mentors: GraduationCap,
  notifications: Bell,
  postJob: Megaphone,
  candidates: Users,
  analytics: BarChart3,
  assessments: Brain,
  settings: Settings,
  users: Users,
  revenue: LineChart,
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

function groupsFor(role: UserRole): NavGroup[] {
  switch (role) {
    case "JOBSEEKER":
      return [
        {
          items: [{ href: "/dashboard/job-seeker", labelKey: "dashboard", Icon: ICON.dashboard }],
        },
        {
          sectionKey: "groupWork",
          items: [
            { href: "/dashboard/job-seeker/profile", labelKey: "profile", Icon: ICON.profile },
            { href: "/dashboard/job-seeker/cv-builder", labelKey: "cv", Icon: ICON.cv },
            { href: "/dashboard/job-seeker/jobs", labelKey: "jobs", Icon: ICON.jobs },
            { href: "/dashboard/job-seeker/applications", labelKey: "applications", Icon: ICON.applications },
            { href: "/dashboard/job-seeker/invites", labelKey: "invites", Icon: ICON.applications },
            { href: "/dashboard/job-seeker/messages", labelKey: "messages", Icon: ICON.messages },
          ],
        },
        {
          sectionKey: "groupGrow",
          items: [
            { href: "/dashboard/job-seeker/assessment", labelKey: "assessment", Icon: ICON.assessment },
            { href: "/dashboard/job-seeker/interview", labelKey: "interview", Icon: ICON.interview },
            { href: "/dashboard/job-seeker/mentors", labelKey: "mentors", Icon: ICON.mentors },
          ],
        },
        {
          sectionKey: "groupAccount",
          items: [
            { href: "/dashboard/job-seeker/notifications", labelKey: "notifications", Icon: ICON.notifications },
          ],
        },
      ];
    case "EMPLOYER":
      return [
        {
          items: [{ href: "/dashboard/employer", labelKey: "dashboard", Icon: ICON.dashboard }],
        },
        {
          sectionKey: "groupHiring",
          items: [
            { href: "/dashboard/employer/profile", labelKey: "profile", Icon: ICON.profile },
            { href: "/dashboard/employer/post-job", labelKey: "postJob", Icon: ICON.postJob },
            { href: "/dashboard/employer/jobs", labelKey: "jobs", Icon: ICON.jobs },
            { href: "/dashboard/employer/candidates", labelKey: "candidates", Icon: ICON.candidates },
            { href: "/dashboard/employer/messages", labelKey: "messages", Icon: ICON.messages },
            { href: "/dashboard/employer/interviews", labelKey: "aiInterviews", Icon: ICON.aiInterviews },
            {
              href: "/dashboard/employer/talent-pool",
              labelKey: "recruitingTalentPool",
              Icon: ICON.recruitingTalentPool,
            },
          ],
        },
        {
          sectionKey: "groupInsights",
          items: [
            { href: "/dashboard/employer/analytics", labelKey: "analytics", Icon: ICON.analytics },
            { href: "/dashboard/employer/assessments", labelKey: "assessments", Icon: ICON.assessments },
          ],
        },
        {
          sectionKey: "groupAccount",
          items: [
            { href: "/dashboard/employer/notifications", labelKey: "notifications", Icon: ICON.notifications },
            { href: "/dashboard/employer/settings", labelKey: "settings", Icon: ICON.settings },
          ],
        },
      ];
    case "ADMIN":
      return [
        {
          items: [{ href: "/dashboard/admin", labelKey: "dashboard", Icon: ICON.dashboard }],
        },
        {
          sectionKey: "groupPlatform",
          items: [
            { href: "/dashboard/admin/users", labelKey: "users", Icon: ICON.users },
            { href: "/dashboard/admin/jobs", labelKey: "jobs", Icon: ICON.jobs },
            { href: "/dashboard/admin/assessments", labelKey: "assessments", Icon: ICON.assessments },
            { href: "/dashboard/admin/talent-pool", labelKey: "talentPool", Icon: ICON.talentPool },
            { href: "/dashboard/admin/revenue", labelKey: "revenue", Icon: ICON.revenue },
          ],
        },
        {
          sectionKey: "groupAccount",
          items: [{ href: "/dashboard/admin/settings", labelKey: "settings", Icon: ICON.settings }],
        },
      ];
    default:
      return [];
  }
}

export function Sidebar({ locale, role }: SidebarProps) {
  const session = useSession();
  const pathname = usePathname();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useDashboardUI();
  const t = useTranslations("sidebar");
  const tNav = useTranslations("nav");
  const tDash = useTranslations("dashboard");
  const roleKey =
    role === "JOBSEEKER" ? "jobSeeker" : role === "EMPLOYER" ? "employer" : "admin";
  const root = dashboardRoot(role);

  function labelFor(item: NavItem): string {
    return t(`${roleKey}.${item.labelKey}` as "jobSeeker.dashboard");
  }

  function isActive(href: string): boolean {
    if (href === root) {
      return pathname === root;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const roleBadgeLabel =
    role === "JOBSEEKER"
      ? tDash("jobSeeker")
      : role === "EMPLOYER"
        ? tDash("employer")
        : tDash("admin");

  const rawTier = session.data?.user?.subscriptionTier as string | undefined;
  const subscriptionTier: SubscriptionTier =
    rawTier === SubscriptionTier.PROFESSIONAL || rawTier === "PROFESSIONAL"
      ? SubscriptionTier.PROFESSIONAL
      : rawTier === SubscriptionTier.PREMIUM || rawTier === "PREMIUM"
        ? SubscriptionTier.PREMIUM
        : SubscriptionTier.FREE;
  const planBadgeLabel =
    subscriptionTier === SubscriptionTier.FREE
      ? t("badges.tierFree" as const)
      : subscriptionTier === SubscriptionTier.PROFESSIONAL
        ? t("badges.tierProfessional" as const)
        : t("badges.tierPremium" as const);
  const planBadgeClass =
    subscriptionTier === SubscriptionTier.FREE
      ? "bg-gray-600"
      : subscriptionTier === SubscriptionTier.PROFESSIONAL
        ? "bg-[#2563EB]"
        : "bg-[#B8860F]";

  const groups = groupsFor(role).map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (role === "EMPLOYER" && item.labelKey === "analytics") {
        return hasAccess(subscriptionTier, "employer_analytics");
      }
      return true;
    }),
  }));

  const userEmail =
    session.data?.user?.email !== undefined &&
    typeof session.data.user.email === "string"
      ? session.data.user.email
      : null;

  const isRtl = locale === "ar" || locale === "ur";

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

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
        aria-label={t("regionAria")}
        className={cn(
          "sidebar-gradient fixed start-0 top-14 z-30 flex h-[calc(100vh-3.5rem)] w-64 shrink-0 flex-col overflow-y-auto",
          "transition-transform duration-200 ease-out",
          mobileSidebarOpen ? "translate-x-0" : isRtl ? "translate-x-full" : "-translate-x-full",
          "md:translate-x-0",
        )}
      >
      <nav className="flex flex-1 flex-col p-4 pt-5" role="navigation">
        {groups.map((group, gi) => (
          <div
            key={gi}
            className={cn(
              gi > 0 && "border-t border-white/10 pt-5 mt-4",
              "flex flex-col gap-1",
            )}
          >
            {group.sectionKey ? (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                {t(group.sectionKey as "groupWork")}
              </p>
            ) : null}
            {group.items.map((item) => {
              const on = isActive(item.href);
              const Icon = item.Icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border-s-[3px] px-3 py-3 text-sm font-medium transition-colors duration-150",
                    on
                      ? "border-brand-teal bg-[rgba(29,158,117,0.15)] text-white"
                      : "border-transparent text-white/90 hover:bg-white/[0.07]",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      on ? "text-[#1D9E75]" : "text-white/60",
                    )}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-start">{labelFor(item)}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/10 p-4">
        {userEmail ? (
          <>
            <div className="mb-4 flex items-center gap-3">
              <Avatar
                src={session.data?.user?.image ?? null}
                name={session.data?.user?.name ?? null}
                email={userEmail}
                size="md"
                className="ring-2 ring-brand-teal ring-offset-2 ring-offset-[#0D2137]"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {session.data?.user?.name ?? userEmail}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {role === "ADMIN" ? (
                    <span className="inline-flex rounded-full bg-[#1D9E75] px-2 py-0.5 text-xs font-semibold text-white">
                      {roleBadgeLabel}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold text-white",
                        planBadgeClass,
                      )}
                    >
                      {planBadgeLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              className={cn(
                "flex min-h-11 w-full items-center justify-center rounded-lg border border-white/20 px-3 text-sm font-medium text-white transition-colors duration-150",
                "hover:border-red-500 hover:bg-red-500/15 hover:text-red-100",
              )}
              onClick={() => signOut({ callbackUrl: `/${locale}/auth/login` })}
            >
              {tNav("logout")}
            </button>
          </>
        ) : null}
      </div>
    </aside>
    </>
  );
}
