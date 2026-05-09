import { NextResponse, type NextRequest } from "next/server";
import { ApplicationStatus, Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";

const qpSchema = z.object({
  jobId: z.string().optional(),
  status: z.nativeEnum(ApplicationStatus).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(10),
  sort: z.enum(["newest", "oldest", "match"]).optional().default("newest"),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = qpSchema.safeParse({
    jobId: url.searchParams.get("jobId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
  });

  const jobIdFilter = parsed.success ? parsed.data.jobId : undefined;
  const statusFilter = parsed.success ? parsed.data.status : undefined;
  const page = parsed.success ? parsed.data.page : 1;
  const pageSize = parsed.success ? parsed.data.pageSize : 10;
  const sort = parsed.success ? parsed.data.sort : "newest";

  const prisma = getPrisma();
  const employerId = session.user.id;

  const baseWhere = {
    job: { employerId },
    ...(jobIdFilter ? { jobId: jobIdFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const orderBy: Prisma.ApplicationOrderByWithRelationInput | Prisma.ApplicationOrderByWithRelationInput[] =
    sort === "oldest"
      ? { createdAt: "asc" }
      : sort === "match"
        ? [{ matchScore: "desc" }, { createdAt: "desc" }]
        : { createdAt: "desc" };

  const [total, rows] = await Promise.all([
    prisma.application.count({ where: baseWhere }),
    prisma.application.findMany({
      where: baseWhere,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        createdAt: true,
        matchScore: true,
        job: { select: { id: true, title: true } },
        jobSeeker: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return NextResponse.json({
    success: true,
    data: {
      items: rows.map((r) => ({
        id: r.id,
        status: r.status,
        matchScore: r.matchScore,
        createdAt: r.createdAt.toISOString(),
        jobId: r.job.id,
        jobTitle: r.job.title,
        candidateName: r.jobSeeker.name,
        candidateEmail: r.jobSeeker.email,
        candidateImage: r.jobSeeker.image,
        candidateId: r.jobSeeker.id,
      })),
      page,
      pageSize,
      total,
      totalPages,
    },
  });
}
