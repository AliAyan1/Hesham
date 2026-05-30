import { AssessmentStatus, InterviewStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ];
  return lines.join("\r\n");
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const type = new URL(request.url).searchParams.get("type") ?? "stats";
  const prisma = getPrisma();

  if (type === "audit") {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
      include: { user: { select: { email: true } } },
    });
    const csv = toCsv(
      ["id", "createdAt", "userEmail", "action", "entity", "entityId"],
      logs.map((l) => [
        l.id,
        l.createdAt.toISOString(),
        l.user?.email ?? "",
        l.action,
        l.entity,
        l.entityId ?? "",
      ]),
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="audit-log.csv"',
      },
    });
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    jobSeekers,
    employers,
    newUsersMonth,
    jobs,
    applications,
    assessmentsDone,
    interviewsDone,
    hires,
    payments,
  ] = await Promise.all([
    prisma.user.count({ where: { role: UserRole.JOBSEEKER } }),
    prisma.user.count({ where: { role: UserRole.EMPLOYER } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.job.count(),
    prisma.application.count(),
    prisma.assessment.count({ where: { status: AssessmentStatus.COMPLETED } }),
    prisma.videoInterview.count({
      where: { status: { in: [InterviewStatus.COMPLETED, InterviewStatus.FLAGGED] } },
    }),
    prisma.application.count({ where: { status: "HIRED" } }),
    prisma.recruitmentPayment.findMany({
      where: { status: "PAID" },
      select: { totalAmount: true, paidAt: true },
    }),
  ]);

  const recruitmentRevenue = payments.reduce((s, p) => s + p.totalAmount, 0);
  const revenueThisMonth = payments
    .filter((p) => p.paidAt && p.paidAt >= monthStart)
    .reduce((s, p) => s + p.totalAmount, 0);
  const passAssessments = await prisma.assessment.count({
    where: { status: AssessmentStatus.COMPLETED, totalScore: { gte: 50 } },
  });
  const assessmentPassRate =
    assessmentsDone > 0 ? Math.round((passAssessments / assessmentsDone) * 100) : 0;

  const csv = toCsv(
    ["metric", "value"],
    [
      ["job_seekers", jobSeekers],
      ["employers", employers],
      ["new_users_this_month", newUsersMonth],
      ["jobs", jobs],
      ["applications", applications],
      ["assessments_completed", assessmentsDone],
      ["interviews_completed", interviewsDone],
      ["hires", hires],
      ["recruitment_revenue_sar", recruitmentRevenue],
      ["revenue_this_month_sar", revenueThisMonth],
      ["assessment_pass_rate_pct", assessmentPassRate],
      ["exported_at", new Date().toISOString()],
    ],
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="platform-stats.csv"',
    },
  });
}
