import { AssessmentStatus, InterviewStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
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

  return NextResponse.json({
    success: true,
    data: {
      users: { jobSeekers, employers, newThisMonth: newUsersMonth },
      jobs,
      applications,
      assessmentsDone,
      interviewsDone,
      hires,
      revenue: { recruitmentFees: recruitmentRevenue, thisMonth: revenueThisMonth },
      assessmentPassRate,
    },
  });
}
