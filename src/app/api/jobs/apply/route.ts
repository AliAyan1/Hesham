import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import { NotificationType } from "@prisma/client";

const bodySchema = z.object({
  jobId: z.string().min(1),
  coverLetter: z.string().max(8000).optional(),
});

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ applicationId: string }>>> {
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
  const seekerId = session.user.id;

  const job = await prisma.job.findFirst({
    where: { id: parsed.data.jobId, isActive: true },
    include: {
      employer: {
        select: {
          id: true,
          name: true,
          email: true,
          employerProfile: { select: { companyName: true } },
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
  }

  const cv = await prisma.cV.findUnique({ where: { userId: seekerId }, select: { id: true } });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.application.create({
        data: {
          jobId: job.id,
          jobSeekerId: seekerId,
          coverLetter: parsed.data.coverLetter,
          ...(cv ? { cvSnapshot: { cvId: cv.id } } : {}),
        },
        select: { id: true },
      });

      await tx.job.update({
        where: { id: job.id },
        data: { applicationCount: { increment: 1 } },
        select: { id: true },
      });

      return created;
    });

    const seeker = await prisma.user.findUnique({
      where: { id: seekerId },
      select: { name: true, email: true },
    });
    const displayName =
      seeker?.name?.trim() || seeker?.email?.split("@")[0] || "Candidate";

    await createUserNotification({
      userId: job.employerId,
      type: NotificationType.NEW_APPLICATION,
      title: "New application",
      titleAr: "طلب جديد",
      message: `${displayName} applied for ${job.title}.`,
      messageAr: `${displayName} قدّم طلبًا لوظيفة ${job.title}.`,
      link: `/dashboard/employer/candidates?job=${job.id}`,
    });

    return NextResponse.json({ success: true, data: { applicationId: result.id } });
  } catch (e: unknown) {
    const msg = typeof e === "object" && e !== null && "code" in e ? String(e.code) : "";
    if (msg === "P2002") {
      return NextResponse.json(
        { success: false, error: "already_applied" },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: "apply_failed" }, { status: 500 });
  }
}
