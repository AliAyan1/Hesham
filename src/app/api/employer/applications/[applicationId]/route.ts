import { NextResponse, type NextRequest } from "next/server";
import { ApplicationStatus, NotificationType, UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { createUserNotification } from "@/lib/notifications/create-user-notification";

const patchSchema = z.object({
  status: z.nativeEnum(ApplicationStatus),
});

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ applicationId: string }> },
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await ctx.params;
  const raw: unknown = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();

  const existing = await prisma.application.findFirst({
    where: {
      id: applicationId,
      job: { employerId: session.user.id },
    },
    include: {
      job: {
        select: {
          title: true,
          employer: {
            select: {
              employerProfile: { select: { companyName: true } },
              name: true,
            },
          },
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: { status: parsed.data.status },
    select: { id: true },
  });

  const company =
    existing.job.employer.employerProfile?.companyName?.trim() ||
    existing.job.employer.name ||
    "Employer";

  await createUserNotification({
    userId: existing.jobSeekerId,
    type: NotificationType.APPLICATION_UPDATE,
    title: "Application status updated",
    titleAr: "تحديث حالة الطلب",
    message: `Your application for ${existing.job.title} at ${company} is now ${parsed.data.status}.`,
    messageAr: `طلبك لوظيفة ${existing.job.title} لدى ${company}: الحالة ${parsed.data.status}.`,
    link: `/dashboard/job-seeker/applications`,
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}
