import { InterviewStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { defaultInterviewTemplate, parseInterviewTemplate } from "@/lib/employer-interview/template";
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const employerId = session.user.id;

  const jobs = await prisma.job.findMany({
    where: { employerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      applicationCount: true,
    },
  });

  const jobIds = jobs.map((j) => j.id);
  const tmplRows =
    jobIds.length === 0
      ? []
      : await prisma.interviewTemplate.findMany({
          where: { jobId: { in: jobIds } },
          select: { jobId: true, template: true },
        });
  const tplByJob = new Map(
    tmplRows.map((r) => [r.jobId, parseInterviewTemplate(r.template) ?? defaultInterviewTemplate()]),
  );
  const interviewed =
    jobIds.length === 0
      ? []
      : await prisma.videoInterview.groupBy({
          by: ["jobId"],
          where: {
            jobId: { in: jobIds },
            status: { in: [InterviewStatus.COMPLETED, InterviewStatus.FLAGGED] },
          },
          _count: { _all: true },
        });
  const countByJob = new Map<string, number>();
  for (const row of interviewed) {
    if (row.jobId) countByJob.set(row.jobId, row._count._all);
  }

  return NextResponse.json({
    success: true,
    data: {
      jobs: jobs.map((j) => {
        const tpl = tplByJob.get(j.id) ?? defaultInterviewTemplate();
        let setup: "none" | "ai" | "custom" = "none";
        if (tpl && tpl.questions.length > 0) {
          setup = tpl.mode === "custom" ? "custom" : "ai";
        }
        return {
          id: j.id,
          title: j.title,
          applicationCount: j.applicationCount,
          interviewedCount: countByJob.get(j.id) ?? 0,
          interviewSetup: setup,
          questionCount: tpl?.questions.length ?? 0,
        };
      }),
    },
  });
}
