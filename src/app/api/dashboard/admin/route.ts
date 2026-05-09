import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { AdminDashboardPayload } from "@/types/dashboard";

export async function GET(): Promise<
  NextResponse<AdminDashboardPayload | { error: string }>
> {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();

    const [
      totalJobSeekers,
      totalEmployers,
      totalJobs,
      totalAssessments,
      recentUsers,
      recentJobs,
    ] = await Promise.all([
      prisma.user.count({ where: { role: UserRole.JOBSEEKER } }),
      prisma.user.count({ where: { role: UserRole.EMPLOYER } }),
      prisma.job.count(),
      prisma.profile.count({
        where: { atsScore: { not: null } },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.job.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          category: true,
          isActive: true,
          createdAt: true,
        },
      }),
    ]);

    const payload: AdminDashboardPayload = {
      totalJobSeekers,
      totalEmployers,
      totalJobs,
      totalAssessments,
      recentUsers: recentUsers.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
      recentJobs: recentJobs.map((j) => ({
        ...j,
        createdAt: j.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
