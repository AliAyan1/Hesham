import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const rows = await prisma.application.findMany({
    where: { jobSeekerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      job: {
        select: {
          id: true,
          title: true,
          employer: {
            select: {
              name: true,
              email: true,
              employerProfile: { select: { companyName: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      items: rows.map((r) => ({
        id: r.id,
        jobId: r.job.id,
        jobTitle: r.job.title,
        company:
          r.job.employer.employerProfile?.companyName?.trim() ||
          r.job.employer.name ||
          r.job.employer.email,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    },
  });
}
