import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { apiFailure, apiSuccess, runApiRoute } from "@/lib/api/route-handler";
import { maskSalaryIfHidden } from "@/lib/jobs/mask-salary";

export async function GET(): Promise<NextResponse> {
  return runApiRoute("jobs/saved", async () => {
    const session = await getServerSession();
    if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
      return apiFailure("Unauthorized", 401);
    }

    const prisma = getPrisma();
    const rows = await prisma.savedJob.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        job: {
          select: {
            id: true,
            title: true,
            category: true,
            type: true,
            location: true,
            isRemote: true,
            salaryMin: true,
            salaryMax: true,
            currency: true,
            hideSalary: true,
            createdAt: true,
            employer: {
              select: {
                name: true,
                image: true,
                employerProfile: { select: { companyName: true } },
              },
            },
          },
        },
      },
    });

    return apiSuccess({
      items: rows.map((row) => {
        const publicJob = maskSalaryIfHidden(row.job);
        return {
          savedAt: row.createdAt.toISOString(),
          id: row.job.id,
          title: row.job.title,
          category: row.job.category,
          type: row.job.type,
          location: row.job.location,
          isRemote: row.job.isRemote,
          salaryMin: publicJob.salaryMin,
          salaryMax: publicJob.salaryMax,
          currency: row.job.currency,
          hideSalary: row.job.hideSalary,
          createdAt: row.job.createdAt.toISOString(),
          companyName:
            row.job.employer.employerProfile?.companyName?.trim() ||
            row.job.employer.name ||
            "Company",
          employerImage: row.job.employer.image,
        };
      }),
    });
  });
}
