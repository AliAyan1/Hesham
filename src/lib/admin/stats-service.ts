import {
  ApplicationStatus,
  AssessmentStatus,
  InterviewStatus,
  SessionStatus,
  UserRole,
  type Prisma,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";
import {
  addMonths,
  monthKey,
  monthLabel,
  startOfDay,
  startOfMonth,
  subscriptionAmountForTier,
} from "@/lib/admin/revenue";
import type {
  AdminActivityItem,
  AdminApplicationStatusBar,
  AdminGrowthPoint,
  AdminInterviewsPayload,
  AdminJobsPayload,
  AdminRevenueMonth,
  AdminScoreBucket,
  AdminStatsPayload,
  AdminSubscriptionsPayload,
  FlaggedAssessmentRow,
  FlaggedInterviewRow,
  PendingMentorRow,
  PendingPayoutRow,
} from "@/types/admin";

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

function proctoringFlagCount(flags: unknown): number {
  if (!flags || typeof flags !== "object") return 0;
  const o = flags as Record<string, unknown>;
  if (typeof o.count === "number") return o.count;
  if (Array.isArray(o.events)) return o.events.length;
  return 0;
}

function isUserSuspended(proctoringSuspendedUntil: Date | null): boolean {
  return Boolean(
    proctoringSuspendedUntil && proctoringSuspendedUntil.getTime() > Date.now(),
  );
}

export async function fetchAdminStatsPayload(): Promise<AdminStatsPayload> {
  const prisma = getPrisma();
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const lastMonthStart = addMonths(monthStart, -1);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalUsers,
    newUsersToday,
    activeJobs,
    jobsPostedToday,
    hiresTotal,
    hiresThisMonth,
    jobSeekerCounts,
    employerTotal,
    employersWithJobs,
    assessmentsCompleted,
    assessmentsFlagged,
    assessmentsInProgress,
    interviewsCompleted,
    interviewsFlagged,
    recruitmentPaid,
    mentorSessionsCompleted,
    subscriptionUpgrades,
    applicationsGrouped,
    completedAssessmentsScores,
    usersLast30,
    mentorsLast30,
    pendingMentorsRaw,
    flaggedAssessmentsRaw,
    flaggedInterviewsRaw,
    pendingPayoutsRaw,
    recentAudit,
    recentUsers,
    recentJobs,
    recentAssessments,
    recentPayments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.job.count({ where: { isActive: true } }),
    prisma.job.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.application.count({ where: { status: ApplicationStatus.HIRED } }),
    prisma.application.count({
      where: { status: ApplicationStatus.HIRED, updatedAt: { gte: monthStart } },
    }),
    prisma.user.groupBy({
      by: ["subscriptionTier"],
      where: { role: UserRole.JOBSEEKER },
      _count: true,
    }),
    prisma.user.count({ where: { role: UserRole.EMPLOYER } }),
    prisma.user.count({
      where: {
        role: UserRole.EMPLOYER,
        jobs: { some: { isActive: true } },
      },
    }),
    prisma.assessment.count({ where: { status: AssessmentStatus.COMPLETED } }),
    prisma.assessment.count({
      where: { OR: [{ isFlagged: true }, { status: AssessmentStatus.FLAGGED }] },
    }),
    prisma.assessment.count({ where: { status: AssessmentStatus.IN_PROGRESS } }),
    prisma.videoInterview.count({
      where: { status: InterviewStatus.COMPLETED },
    }),
    prisma.videoInterview.count({
      where: { OR: [{ isFlagged: true }, { status: InterviewStatus.FLAGGED }] },
    }),
    prisma.recruitmentPayment.findMany({
      where: { status: "PAID" },
      select: { amount: true, vatAmount: true, totalAmount: true, paidAt: true },
    }),
    prisma.mentorSession.findMany({
      where: { status: SessionStatus.COMPLETED },
      select: { price: true, endedAt: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: {
        subscriptionTier: { in: ["PROFESSIONAL", "PREMIUM"] },
        subscriptionStart: { not: null },
      },
      select: { subscriptionTier: true, subscriptionStart: true },
    }),
    prisma.application.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.assessment.findMany({
      where: { status: AssessmentStatus.COMPLETED, totalScore: { not: null } },
      select: { totalScore: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { role: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { role: UserRole.MENTOR, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.mentor.findMany({
      where: { isApproved: false, rejectedReason: null },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    prisma.assessment.findMany({
      where: { OR: [{ isFlagged: true }, { status: AssessmentStatus.FLAGGED }] },
      orderBy: { completedAt: "desc" },
      take: 20,
      include: {
        user: { select: { id: true, name: true, image: true } },
        proctoringSessions: { select: { tabSwitches: true, faceNotVisible: true } },
      },
    }),
    prisma.videoInterview.findMany({
      where: { OR: [{ isFlagged: true }, { status: InterviewStatus.FLAGGED }] },
      orderBy: { completedAt: "desc" },
      take: 20,
      include: {
        user: { select: { id: true, name: true, image: true } },
        proctoringSessions: { select: { tabSwitches: true, faceNotVisible: true } },
      },
    }),
    prisma.mentorPayoutRequest.findMany({
      where: { status: "REQUESTED" },
      orderBy: { createdAt: "asc" },
      take: 20,
      include: {
        mentor: {
          include: {
            user: { select: { name: true, image: true } },
            _count: { select: { sessions: true } },
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, createdAt: true },
    }),
    prisma.assessment.findMany({
      where: { status: AssessmentStatus.COMPLETED },
      orderBy: { completedAt: "desc" },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
    prisma.recruitmentPayment.findMany({
      where: { status: "PAID" },
      orderBy: { paidAt: "desc" },
      take: 5,
      select: { totalAmount: true, paidAt: true },
    }),
  ]);

  const tierCount = (tier: string) =>
    jobSeekerCounts.find((g) => g.subscriptionTier === tier)?._count ?? 0;

  const recruitmentTotal = recruitmentPaid.reduce((s, p) => s + p.totalAmount, 0);
  const mentorTotal = mentorSessionsCompleted.reduce((s, m) => s + m.price, 0);
  const subscriptionTotal = subscriptionUpgrades.reduce(
    (s, u) => s + subscriptionAmountForTier(u.subscriptionTier),
    0,
  );
  const totalRevenue = recruitmentTotal + mentorTotal + subscriptionTotal;

  const revenueThisMonth =
    recruitmentPaid
      .filter((p) => p.paidAt && p.paidAt >= monthStart)
      .reduce((s, p) => s + p.totalAmount, 0) +
    mentorSessionsCompleted
      .filter((m) => {
        const d = m.endedAt ?? m.createdAt;
        return d >= monthStart;
      })
      .reduce((s, m) => s + m.price, 0) +
    subscriptionUpgrades
      .filter((u) => u.subscriptionStart && u.subscriptionStart >= monthStart)
      .reduce((s, u) => s + subscriptionAmountForTier(u.subscriptionTier), 0);

  const userGrowth: AdminGrowthPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    const key = startOfDay(day).getTime();
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const dayEnd = startOfDay(next).getTime();
    const inDay = (d: Date) => {
      const t = d.getTime();
      return t >= key && t < dayEnd;
    };
    userGrowth.push({
      date: day.toISOString().slice(0, 10),
      jobSeekers: usersLast30.filter(
        (u) => u.role === UserRole.JOBSEEKER && inDay(u.createdAt),
      ).length,
      employers: usersLast30.filter(
        (u) => u.role === UserRole.EMPLOYER && inDay(u.createdAt),
      ).length,
      mentors: mentorsLast30.filter((m) => inDay(m.createdAt)).length,
    });
  }

  const revenueByMonth: AdminRevenueMonth[] = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = addMonths(monthStart, -i);
    const mEnd = addMonths(mStart, 1);
    const subs = subscriptionUpgrades
      .filter(
        (u) =>
          u.subscriptionStart &&
          u.subscriptionStart >= mStart &&
          u.subscriptionStart < mEnd,
      )
      .reduce((s, u) => s + subscriptionAmountForTier(u.subscriptionTier), 0);
    const recruit = recruitmentPaid
      .filter((p) => p.paidAt && p.paidAt >= mStart && p.paidAt < mEnd)
      .reduce((s, p) => s + p.totalAmount, 0);
    const sessions = mentorSessionsCompleted
      .filter((s) => {
        const d = s.endedAt ?? s.createdAt;
        return d >= mStart && d < mEnd;
      })
      .reduce((sum, s) => sum + s.price, 0);
    revenueByMonth.push({
      month: monthLabel(mStart),
      subscriptions: Math.round(subs),
      recruitmentFees: Math.round(recruit),
      mentorSessions: Math.round(sessions),
    });
  }

  const buckets = { excellent: 0, good: 0, pass: 0, failed: 0 };
  for (const a of completedAssessmentsScores) {
    const s = a.totalScore ?? 0;
    if (s >= 80) buckets.excellent++;
    else if (s >= 60) buckets.good++;
    else if (s >= 50) buckets.pass++;
    else buckets.failed++;
  }
  const scoreTotal = completedAssessmentsScores.length || 1;
  const scoreDistribution: AdminScoreBucket[] = [
    {
      label: "80-100",
      count: buckets.excellent,
      percentage: Math.round((buckets.excellent / scoreTotal) * 100),
      color: "#1D9E75",
    },
    {
      label: "60-79",
      count: buckets.good,
      percentage: Math.round((buckets.good / scoreTotal) * 100),
      color: "#0F4C75",
    },
    {
      label: "50-59",
      count: buckets.pass,
      percentage: Math.round((buckets.pass / scoreTotal) * 100),
      color: "#C9973A",
    },
    {
      label: "<50",
      count: buckets.failed,
      percentage: Math.round((buckets.failed / scoreTotal) * 100),
      color: "#DC2626",
    },
  ];

  const statusColors: Record<string, string> = {
    PENDING: "#6B7280",
    REVIEWED: "#0F4C75",
    SHORTLISTED: "#1D9E75",
    HIRED: "#7C3AED",
    REJECTED: "#DC2626",
  };

  const applicationsByStatus: AdminApplicationStatusBar[] = Object.values(
    ApplicationStatus,
  ).map((status) => ({
    status,
    count: applicationsGrouped.find((g) => g.status === status)?._count ?? 0,
    color: statusColors[status] ?? "#6B7280",
  }));

  const pendingMentors: PendingMentorRow[] = pendingMentorsRaw.map((m) => ({
    id: m.id,
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
    expertise: jsonStringArray(m.expertise),
    industries: jsonStringArray(m.industries),
    appliedAt: m.createdAt.toISOString(),
  }));

  const flaggedAssessments: FlaggedAssessmentRow[] = flaggedAssessmentsRaw.map(
    (a) => {
      const flagCount =
        proctoringFlagCount(a.proctoringFlags) +
        a.proctoringSessions.reduce(
          (s, p) => s + p.tabSwitches + p.faceNotVisible,
          0,
        );
      return {
        id: a.id,
        userId: a.userId,
        name: a.user.name,
        image: a.user.image,
        completedAt: a.completedAt?.toISOString() ?? null,
        flagReason: a.flagReason,
        flagCount,
        overallScore: a.totalScore,
      };
    },
  );

  const flaggedInterviews: FlaggedInterviewRow[] = flaggedInterviewsRaw.map((v) => {
    const flagCount =
      proctoringFlagCount(v.proctoringFlags) +
      v.proctoringSessions.reduce((s, p) => s + p.tabSwitches + p.faceNotVisible, 0);
    return {
      id: v.id,
      userId: v.userId,
      name: v.user.name,
      image: v.user.image,
      completedAt: v.completedAt?.toISOString() ?? null,
      flagReason: null,
      flagCount,
    };
  });

  const pendingPayouts: PendingPayoutRow[] = pendingPayoutsRaw.map((p) => ({
    id: p.id,
    mentorId: p.mentorId,
    name: p.mentor.user.name,
    image: p.mentor.user.image,
    sessionsCount: p.mentor._count.sessions,
    amount: p.amount,
    bankName: p.bankName,
    iban: p.iban,
    requestedAt: p.createdAt.toISOString(),
  }));

  const pendingPayoutsTotal = pendingPayouts.reduce((s, p) => s + p.amount, 0);

  const activity: AdminActivityItem[] = buildActivityFeed({
    recentUsers,
    recentJobs,
    recentAssessments,
    recentPayments,
    recentAudit,
    flaggedAssessmentsRaw,
  });

  return {
    overview: {
      totalUsers,
      newUsersToday,
      activeJobs,
      jobsPostedToday,
      totalRevenue: Math.round(totalRevenue),
      revenueThisMonth: Math.round(revenueThisMonth),
      successfulHires: hiresTotal,
      hiresThisMonth,
      jobSeekers: {
        total: tierCount("FREE") + tierCount("PROFESSIONAL") + tierCount("PREMIUM"),
        free: tierCount("FREE"),
        pro: tierCount("PROFESSIONAL"),
        premium: tierCount("PREMIUM"),
      },
      employers: {
        total: employerTotal,
        active: employersWithJobs,
        inactive: Math.max(0, employerTotal - employersWithJobs),
      },
      assessments: {
        completed: assessmentsCompleted,
        flagged: assessmentsFlagged,
        inProgress: assessmentsInProgress,
      },
      interviews: {
        completed: interviewsCompleted,
        flagged: interviewsFlagged,
      },
    },
    userGrowth,
    revenueByMonth,
    scoreDistribution,
    applicationsByStatus,
    pendingMentors,
    flaggedAssessments,
    flaggedInterviews,
    pendingPayouts,
    pendingPayoutsTotal: Math.round(pendingPayoutsTotal),
    activity,
  };
}

function buildActivityFeed(input: {
  recentUsers: { id: string; name: string | null; createdAt: Date }[];
  recentJobs: { id: string; title: string; createdAt: Date }[];
  recentAssessments: {
    id: string;
    user: { name: string | null };
    completedAt: Date | null;
    isFlagged: boolean;
  }[];
  recentPayments: { totalAmount: number; paidAt: Date | null }[];
  recentAudit: {
    id: string;
    action: string;
    createdAt: Date;
    user: { name: string | null; email: string | null } | null;
  }[];
  flaggedAssessmentsRaw: { id: string; user: { name: string | null }; completedAt: Date | null }[];
}): AdminActivityItem[] {
  const items: { createdAt: Date; emoji: string; message: string; id: string }[] = [];

  for (const u of input.recentUsers) {
    items.push({
      id: `user-${u.id}`,
      emoji: "🟢",
      message: `New user registered: ${u.name ?? "User"}`,
      createdAt: u.createdAt,
    });
  }
  for (const j of input.recentJobs) {
    items.push({
      id: `job-${j.id}`,
      emoji: "🔵",
      message: `New job posted: ${j.title}`,
      createdAt: j.createdAt,
    });
  }
  for (const a of input.recentAssessments) {
    if (a.isFlagged) {
      items.push({
        id: `aflag-${a.id}`,
        emoji: "🔴",
        message: `Assessment flagged: ${a.user.name ?? "Candidate"}`,
        createdAt: a.completedAt ?? new Date(),
      });
    } else {
      items.push({
        id: `a-${a.id}`,
        emoji: "🟡",
        message: `Assessment completed: ${a.user.name ?? "Candidate"}`,
        createdAt: a.completedAt ?? new Date(),
      });
    }
  }
  for (const p of input.recentPayments) {
    if (!p.paidAt) continue;
    items.push({
      id: `pay-${p.paidAt.getTime()}`,
      emoji: "💰",
      message: `Payment received: SAR ${Math.round(p.totalAmount)}`,
      createdAt: p.paidAt,
    });
  }
  for (const log of input.recentAudit.slice(0, 5)) {
    items.push({
      id: `audit-${log.id}`,
      emoji: "📋",
      message: `${log.action}${log.user?.name ? `: ${log.user.name}` : ""}`,
      createdAt: log.createdAt,
    });
  }

  return items
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20)
    .map((x) => ({
      id: x.id,
      emoji: x.emoji,
      message: x.message,
      createdAt: x.createdAt.toISOString(),
    }));
}

export async function fetchAdminRevenuePayload(): Promise<
  import("@/types/admin").AdminRevenuePayload
> {
  const prisma = getPrisma();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const lastMonthStart = addMonths(monthStart, -1);

  const [recruitmentPaid, mentorSessions, subscriptionUsers] = await Promise.all([
    prisma.recruitmentPayment.findMany({
      where: { status: "PAID" },
      include: {
        employer: { select: { name: true, email: true } },
        obligation: { select: { id: true } },
      },
      orderBy: { paidAt: "desc" },
      take: 200,
    }),
    prisma.mentorSession.findMany({
      where: { status: SessionStatus.COMPLETED },
      include: {
        mentor: { include: { user: { select: { name: true } } } },
        mentee: { select: { name: true } },
      },
      orderBy: { endedAt: "desc" },
      take: 200,
    }),
    prisma.user.findMany({
      where: {
        subscriptionTier: { in: ["PROFESSIONAL", "PREMIUM"] },
        subscriptionStart: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionTier: true,
        subscriptionStart: true,
      },
    }),
  ]);

  const subsAll = subscriptionUsers.reduce(
    (s, u) => s + subscriptionAmountForTier(u.subscriptionTier),
    0,
  );
  const recruitAll = recruitmentPaid.reduce((s, p) => s + p.totalAmount, 0);
  const sessionsAll = mentorSessions.reduce((s, m) => s + m.price, 0);
  const totalAllTime = subsAll + recruitAll + sessionsAll;

  const sumInRange = (
    start: Date,
    end: Date,
  ): { subs: number; recruit: number; sessions: number } => {
    const subs = subscriptionUsers
      .filter(
        (u) =>
          u.subscriptionStart &&
          u.subscriptionStart >= start &&
          u.subscriptionStart < end,
      )
      .reduce((s, u) => s + subscriptionAmountForTier(u.subscriptionTier), 0);
    const recruit = recruitmentPaid
      .filter((p) => p.paidAt && p.paidAt >= start && p.paidAt < end)
      .reduce((s, p) => s + p.totalAmount, 0);
    const sessions = mentorSessions
      .filter((m) => {
        const d = m.endedAt ?? m.createdAt;
        return d >= start && d < end;
      })
      .reduce((s, m) => s + m.price, 0);
    return { subs, recruit, sessions };
  };

  const thisM = sumInRange(monthStart, addMonths(monthStart, 1));
  const lastM = sumInRange(lastMonthStart, monthStart);
  const thisMonthTotal = thisM.subs + thisM.recruit + thisM.sessions;
  const lastMonthTotal = lastM.subs + lastM.recruit + lastM.sessions;
  const growthPercent =
    lastMonthTotal > 0
      ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
      : thisMonthTotal > 0
        ? 100
        : 0;

  const monthlyChart: AdminRevenueMonth[] = [];
  for (let i = 11; i >= 0; i--) {
    const mStart = addMonths(monthStart, -i);
    const mEnd = addMonths(mStart, 1);
    const chunk = sumInRange(mStart, mEnd);
    monthlyChart.push({
      month: monthLabel(mStart),
      subscriptions: Math.round(chunk.subs),
      recruitmentFees: Math.round(chunk.recruit),
      mentorSessions: Math.round(chunk.sessions),
    });
  }

  const pct = (n: number) =>
    totalAllTime > 0 ? Math.round((n / totalAllTime) * 100) : 0;

  const transactions: import("@/types/admin").AdminTransactionRow[] = [
    ...recruitmentPaid.map((p) => ({
      id: p.id,
      date: (p.paidAt ?? p.createdAt).toISOString(),
      type: "RECRUITMENT" as const,
      partyName: p.employer.name ?? p.employer.email,
      amount: p.amount,
      vat: p.vatAmount,
      total: p.totalAmount,
      status: p.status,
    })),
    ...mentorSessions.map((s) => ({
      id: s.id,
      date: (s.endedAt ?? s.createdAt).toISOString(),
      type: "SESSION" as const,
      partyName: s.mentor.user.name ?? s.mentee.name ?? "Session",
      amount: s.price,
      vat: 0,
      total: s.price,
      status: "PAID",
    })),
    ...subscriptionUsers.map((u) => ({
      id: `sub-${u.id}`,
      date: (u.subscriptionStart ?? new Date()).toISOString(),
      type: "SUBSCRIPTION" as const,
      partyName: u.name ?? u.email,
      amount: subscriptionAmountForTier(u.subscriptionTier),
      vat: Math.round(subscriptionAmountForTier(u.subscriptionTier) * 0.15),
      total:
        subscriptionAmountForTier(u.subscriptionTier) +
        Math.round(subscriptionAmountForTier(u.subscriptionTier) * 0.15),
      status: "PAID",
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 100);

  return {
    totalAllTime: Math.round(totalAllTime),
    thisMonth: Math.round(thisMonthTotal),
    lastMonth: Math.round(lastMonthTotal),
    growthPercent,
    breakdown: {
      subscriptions: { amount: Math.round(subsAll), percent: pct(subsAll) },
      recruitmentFees: { amount: Math.round(recruitAll), percent: pct(recruitAll) },
      mentorSessions: { amount: Math.round(sessionsAll), percent: pct(sessionsAll) },
    },
    monthlyChart,
    transactions,
  };
}

export function userStatusFromSuspended(
  proctoringSuspendedUntil: Date | null,
): "ACTIVE" | "SUSPENDED" {
  return isUserSuspended(proctoringSuspendedUntil) ? "SUSPENDED" : "ACTIVE";
}

export async function fetchAdminUsersList(params: {
  role: UserRole;
  page: number;
  pageSize: number;
  search?: string;
  plan?: string;
  assessmentStatus?: string;
  joinedAfter?: string;
}): Promise<import("@/types/admin").AdminUsersListPayload> {
  const prisma = getPrisma();
  const where: Prisma.UserWhereInput = { role: params.role };

  if (params.search?.trim()) {
    const q = params.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  if (params.role === UserRole.JOBSEEKER && params.plan) {
    const tier =
      params.plan === "pro"
        ? "PROFESSIONAL"
        : params.plan === "premium"
          ? "PREMIUM"
          : "FREE";
    where.subscriptionTier = tier;
  }

  if (params.joinedAfter) {
    const d = new Date(params.joinedAfter);
    if (!Number.isNaN(d.getTime())) where.createdAt = { gte: d };
  }

  const [total, users, tierStats] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        subscriptionTier: true,
        createdAt: true,
        proctoringSuspendedUntil: true,
        _count: {
          select: {
            applications: params.role === UserRole.JOBSEEKER,
            jobs: params.role === UserRole.EMPLOYER,
          },
        },
        assessments: {
          where: { status: AssessmentStatus.COMPLETED },
          orderBy: { completedAt: "desc" },
          take: 1,
          select: { totalScore: true, status: true },
        },
      },
    }),
    params.role === UserRole.JOBSEEKER
      ? prisma.user.groupBy({
          by: ["subscriptionTier"],
          where: { role: UserRole.JOBSEEKER },
          _count: true,
        })
      : Promise.resolve([]),
  ]);

  let filtered = users;
  if (params.assessmentStatus === "completed") {
    filtered = users.filter((u) => u.assessments.length > 0);
  } else if (params.assessmentStatus === "not_taken") {
    filtered = users.filter((u) => u.assessments.length === 0);
  } else if (params.assessmentStatus === "flagged") {
    filtered = users.filter((u) =>
      u.assessments.some((a) => a.status === AssessmentStatus.FLAGGED),
    );
  }

  const stats: Record<string, number> = {};
  if (params.role === UserRole.JOBSEEKER) {
    for (const g of tierStats) {
      const key =
        g.subscriptionTier === "PROFESSIONAL"
          ? "pro"
          : g.subscriptionTier === "PREMIUM"
            ? "premium"
            : "free";
      stats[key] = g._count;
    }
    stats.total = Object.values(stats).reduce((a, b) => a + b, 0);
  } else {
    stats.total = total;
  }

  const items: import("@/types/admin").AdminUserRow[] = filtered.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role,
    subscriptionTier: u.subscriptionTier,
    assessmentScore: u.assessments[0]?.totalScore ?? null,
    applicationsCount: u._count.applications ?? 0,
    jobsPostedCount: u._count.jobs ?? 0,
    joinedAt: u.createdAt.toISOString(),
    status: userStatusFromSuspended(u.proctoringSuspendedUntil),
  }));

  return {
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
    stats,
  };
}

export async function fetchAdminJobsPayload(statusFilter?: string): Promise<AdminJobsPayload> {
  const prisma = getPrisma();
  const todayStart = startOfDay(new Date());

  const where: Prisma.JobWhereInput = {};
  if (statusFilter === "active") where.isActive = true;
  else if (statusFilter === "inactive") where.isActive = false;

  const [rows, total, active, inactive, postedToday, appsAgg] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        employer: { select: { name: true, email: true } },
      },
    }),
    prisma.job.count({ where }),
    prisma.job.count({ where: { isActive: true } }),
    prisma.job.count({ where: { isActive: false } }),
    prisma.job.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.job.aggregate({ _sum: { applicationCount: true } }),
  ]);

  return {
    stats: {
      total,
      active,
      inactive,
      postedToday,
      totalApplications: appsAgg._sum.applicationCount ?? 0,
    },
    items: rows.map((j) => ({
      id: j.id,
      title: j.title,
      employerName: j.employer.name,
      employerEmail: j.employer.email,
      category: j.category,
      type: j.type,
      location: j.location,
      isActive: j.isActive,
      isFeatured: j.isFeatured,
      applicationCount: j.applicationCount,
      viewCount: j.viewCount,
      postedAt: j.createdAt.toISOString(),
      expiresAt: j.expiresAt?.toISOString() ?? null,
    })),
  };
}

export async function fetchAdminInterviewsPayload(
  statusFilter?: string,
): Promise<AdminInterviewsPayload> {
  const prisma = getPrisma();

  const where: Prisma.VideoInterviewWhereInput = {};
  if (statusFilter === "completed") where.status = InterviewStatus.COMPLETED;
  else if (statusFilter === "flagged") {
    where.OR = [{ isFlagged: true }, { status: InterviewStatus.FLAGGED }];
  } else if (statusFilter === "in-progress") where.status = InterviewStatus.IN_PROGRESS;
  else if (statusFilter === "pending") where.status = InterviewStatus.PENDING;

  const [rows, total, completed, inProgress, flagged, pending] = await Promise.all([
    prisma.videoInterview.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.videoInterview.count(),
    prisma.videoInterview.count({ where: { status: InterviewStatus.COMPLETED } }),
    prisma.videoInterview.count({ where: { status: InterviewStatus.IN_PROGRESS } }),
    prisma.videoInterview.count({
      where: { OR: [{ isFlagged: true }, { status: InterviewStatus.FLAGGED }] },
    }),
    prisma.videoInterview.count({ where: { status: InterviewStatus.PENDING } }),
  ]);

  const jobIds = [...new Set(rows.map((r) => r.jobId).filter(Boolean))] as string[];
  const jobs =
    jobIds.length > 0
      ? await prisma.job.findMany({
          where: { id: { in: jobIds } },
          select: { id: true, title: true },
        })
      : [];
  const jobTitleById = new Map(jobs.map((j) => [j.id, j.title]));

  return {
    stats: { total, completed, inProgress, flagged, pending },
    items: rows.map((iv) => ({
      id: iv.id,
      userId: iv.userId,
      candidateName: iv.user.name,
      candidateEmail: iv.user.email,
      interviewKind: iv.interviewKind,
      jobTitle: iv.jobId ? (jobTitleById.get(iv.jobId) ?? null) : null,
      status: iv.status,
      overallScore: iv.overallScore,
      isFlagged: iv.isFlagged,
      shareWithEmployers: iv.shareWithEmployers,
      duration: iv.duration,
      startedAt: iv.startedAt?.toISOString() ?? null,
      completedAt: iv.completedAt?.toISOString() ?? null,
    })),
  };
}

export async function fetchAdminSubscriptionsPayload(): Promise<AdminSubscriptionsPayload> {
  const prisma = getPrisma();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = addMonths(monthStart, 1);

  const [tierCounts, paidSubs, recentPayments, activeSubscribers] = await Promise.all([
    prisma.user.groupBy({
      by: ["subscriptionTier"],
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { subscriptionTier: { in: ["PROFESSIONAL", "PREMIUM"] } },
      select: { subscriptionTier: true },
    }),
    prisma.payment.findMany({
      where: { type: "SUBSCRIPTION" },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.user.findMany({
      where: { subscriptionTier: { in: ["PROFESSIONAL", "PREMIUM"] } },
      orderBy: { subscriptionStart: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subscriptionTier: true,
        subscriptionStart: true,
        subscriptionEnd: true,
      },
    }),
  ]);

  const tierMap = Object.fromEntries(
    tierCounts.map((g) => [g.subscriptionTier, g._count._all]),
  ) as Record<string, number>;

  const mrrEstimate = paidSubs.reduce(
    (s, u) => s + subscriptionAmountForTier(u.subscriptionTier),
    0,
  );

  const paidThisMonth = recentPayments
    .filter(
      (p) =>
        p.status === "PAID" &&
        p.paidAt &&
        p.paidAt >= monthStart &&
        p.paidAt < monthEnd,
    )
    .reduce((s, p) => s + p.totalAmount, 0);

  return {
    stats: {
      mrrEstimate: Math.round(mrrEstimate),
      paidThisMonth: Math.round(paidThisMonth),
      free: tierMap.FREE ?? 0,
      professional: tierMap.PROFESSIONAL ?? 0,
      premium: tierMap.PREMIUM ?? 0,
      totalPayments: recentPayments.length,
    },
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      userId: p.userId,
      userName: p.user.name,
      userEmail: p.user.email,
      userRole: p.user.role,
      plan: p.subscriptionPlan,
      amount: p.amount,
      totalAmount: p.totalAmount,
      status: p.status,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
    activeSubscribers: activeSubscribers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      tier: u.subscriptionTier,
      subscriptionStart: u.subscriptionStart?.toISOString() ?? null,
      subscriptionEnd: u.subscriptionEnd?.toISOString() ?? null,
    })),
  };
}
