import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { analyzeJdFit, type JdFitAnalysis } from "@/lib/jobs/jd-fit-analysis";

export const maxDuration = 60;

const bodySchema = z.object({ jobId: z.string().min(1) });

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<JdFitAnalysis>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const [job, cv] = await Promise.all([
    prisma.job.findFirst({
      where: { id: parsed.data.jobId, isActive: true },
      select: {
        title: true,
        description: true,
        requirements: true,
        skills: true,
        hiringMeta: true,
      },
    }),
    prisma.cV.findUnique({
      where: { userId: session.user.id },
      select: {
        professionalTitle: true,
        summary: true,
        experience: true,
        education: true,
        skills: true,
      },
    }),
  ]);

  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
  }
  if (!cv) {
    return NextResponse.json({ success: false, error: "cv_required" }, { status: 403 });
  }

  const analysis = await analyzeJdFit({
    job: {
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      skills: job.skills,
      hiringMeta: job.hiringMeta,
    },
    cv: {
      professionalTitle: cv.professionalTitle,
      summary: cv.summary,
      experience: cv.experience,
      education: cv.education,
      skills: cv.skills,
    },
  });

  return NextResponse.json({ success: true, data: analysis }, { status: 200 });
}
