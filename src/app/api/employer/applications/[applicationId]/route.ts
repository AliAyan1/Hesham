import { NextResponse, type NextRequest } from "next/server";
import { ApplicationStatus, NotificationType, TalentPoolReason, UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import { addTalentPoolEntry } from "@/lib/talent-pool/add-talent-pool-entry";
import { sendTransactionalEmail } from "@/lib/email/send-transactional";
const patchSchema = z
  .object({
    status: z.nativeEnum(ApplicationStatus),
    declineReason: z.string().max(4000).optional(),
    declineReasonCode: z.string().max(64).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === ApplicationStatus.REJECTED && !data.declineReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "declineReason required when rejecting",
        path: ["declineReason"],
      });
    }
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
    const msg =
      parsed.error.issues.find((i) => i.path.includes("declineReason"))?.message ?? "Validation failed";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
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
      jobSeeker: { select: { id: true, email: true, name: true } },
    },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const nextStatus = parsed.data.status;
  const prevStatus = existing.status;
  const becameRejected = nextStatus === ApplicationStatus.REJECTED && prevStatus !== ApplicationStatus.REJECTED;
  const becameHired = nextStatus === ApplicationStatus.HIRED && prevStatus !== ApplicationStatus.HIRED;

  const updateData: {
    status: ApplicationStatus;
    declineReason?: string | null;
    declineReasonCode?: string | null;
    declinedAt?: Date | null;
    offerAcceptedAt?: Date | null;
  } = { status: nextStatus };

  if (nextStatus === ApplicationStatus.REJECTED) {
    updateData.declineReason = parsed.data.declineReason!.trim();
    updateData.declineReasonCode = parsed.data.declineReasonCode?.trim() || null;
    updateData.declinedAt = new Date();
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: updateData,
    select: { id: true },
  });

  if (becameRejected) {
    await addTalentPoolEntry({
      userId: existing.jobSeekerId,
      reason: TalentPoolReason.EMPLOYER_DECLINED,
      sourceApplicationId: applicationId,
    });
  }

  const company =
    existing.job.employer.employerProfile?.companyName?.trim() ||
    existing.job.employer.name ||
    "Employer";

  await createUserNotification({
    userId: existing.jobSeekerId,
    type: NotificationType.APPLICATION_UPDATE,
    title: "Application status updated",
    titleAr: "تحديث حالة الطلب",
    message: `Your application for ${existing.job.title} at ${company} is now ${nextStatus}.`,
    messageAr: `طلبك لوظيفة ${existing.job.title} لدى ${company}: الحالة ${nextStatus}.`,
    link: `/dashboard/job-seeker/applications`,
  });

  if (becameHired && existing.jobSeeker.email) {
    await sendTransactionalEmail({
      to: existing.jobSeeker.email,
      subject: `Congratulations — hired for ${existing.job.title}`,
      html: `<p>Hi ${existing.jobSeeker.name ?? "there"},</p><p>Your application for <strong>${existing.job.title}</strong> at ${company} is marked as hired. The employer may reach out with next steps.</p>`,
    });
  }

  return NextResponse.json({ success: true, data: { ok: true } });
}
