import { NotificationType, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db";
import { requireMentorUser } from "@/lib/mentor/require-mentor";
import { createNotification } from "@/lib/notifications";

const bodySchema = z.object({
  bankName: z.string().min(2).max(120),
  accountHolder: z.string().min(2).max(120),
  iban: z.string().min(10).max(34),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireMentorUser();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const mentor = await prisma.mentor.findUnique({
    where: { id: auth.ctx.mentorId },
    select: { pendingPayout: true, user: { select: { name: true } } },
  });

  if (!mentor || mentor.pendingPayout < 1) {
    return NextResponse.json({ success: false, error: "No pending payout" }, { status: 400 });
  }

  const pendingOpen = await prisma.mentorPayoutRequest.findFirst({
    where: { mentorId: auth.ctx.mentorId, status: "REQUESTED" },
    select: { id: true },
  });
  if (pendingOpen) {
    return NextResponse.json({ success: false, error: "Payout already requested" }, { status: 400 });
  }

  const amount = mentor.pendingPayout;
  const row = await prisma.mentorPayoutRequest.create({
    data: {
      mentorId: auth.ctx.mentorId,
      amount,
      bankName: parsed.data.bankName.trim(),
      accountHolder: parsed.data.accountHolder.trim(),
      iban: parsed.data.iban.trim().toUpperCase(),
      status: "REQUESTED",
    },
    select: { id: true },
  });

  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    select: { id: true },
    take: 20,
  });

  const mentorName = mentor.user.name ?? "Mentor";
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      type: NotificationType.PAYOUT_REQUESTED,
      title: "Payout requested",
      titleAr: "طلب صرف",
      message: `${mentorName} requested SAR ${Math.round(amount)} payout`,
      messageAr: `${mentorName} طلب صرف ${Math.round(amount)} ريال`,
      link: "/dashboard/admin/payouts",
    });
  }

  return NextResponse.json({ success: true, data: { id: row.id } }, { status: 201 });
}
