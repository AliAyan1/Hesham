import { ApplicationStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import { NotificationType } from "@prisma/client";
import { applicationStatusLabelEn } from "@/lib/applications/workflow-status";

const bodySchema = z.object({
  applicationIds: z.array(z.string().min(1)).min(1).max(50),
  status: z.nativeEnum(ApplicationStatus),
  declineReason: z.string().max(2000).optional(),
});

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  if (parsed.data.status === ApplicationStatus.REJECTED && !parsed.data.declineReason?.trim()) {
    return NextResponse.json({ success: false, error: "declineReason required" }, { status: 400 });
  }

  const prisma = getPrisma();
  const apps = await prisma.application.findMany({
    where: {
      id: { in: parsed.data.applicationIds },
      job: { employerId: session.user.id },
    },
    select: {
      id: true,
      jobSeekerId: true,
      job: { select: { title: true } },
    },
  });

  if (!apps.length) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  await prisma.application.updateMany({
    where: { id: { in: apps.map((a) => a.id) } },
    data: {
      status: parsed.data.status,
      ...(parsed.data.status === ApplicationStatus.REJECTED
        ? {
            declineReason: parsed.data.declineReason!.trim(),
            declinedAt: new Date(),
          }
        : {}),
    },
  });

  const label = applicationStatusLabelEn(parsed.data.status);
  await Promise.all(
    apps.map((app) =>
      createUserNotification({
        userId: app.jobSeekerId,
        type: NotificationType.APPLICATION_UPDATE,
        title: `Application update: ${label}`,
        titleAr: "تحديث على طلبك",
        message: `Your application for ${app.job.title} is now: ${label}.`,
        messageAr: `تم تحديث حالة طلبك لوظيفة ${app.job.title}.`,
        link: "/dashboard/job-seeker/applications",
      }),
    ),
  );

  return NextResponse.json({ success: true, data: { updated: apps.length } }, { status: 200 });
}
