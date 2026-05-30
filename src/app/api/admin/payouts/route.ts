import { NotificationType, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { sanitizeUserForPublic } from "@/lib/sanitize-user";

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const pending = await prisma.mentorPayoutRequest.findMany({
    where: { status: "REQUESTED" },
    orderBy: { createdAt: "asc" },
    include: {
      mentor: { include: { user: { select: { id: true, name: true, image: true, role: true } } } },
    },
  });

  const history = await prisma.mentorPayoutRequest.findMany({
    where: { status: "PAID" },
    orderBy: { processedAt: "desc" },
    take: 50,
    include: {
      mentor: { include: { user: { select: { id: true, name: true, role: true } } } },
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      pending: pending.map((p) => ({
        id: p.id,
        amount: p.amount,
        bankName: p.bankName,
        accountHolder: p.accountHolder,
        iban: p.iban,
        createdAt: p.createdAt.toISOString(),
        mentor: sanitizeUserForPublic(p.mentor.user),
      })),
      history: history.map((p) => ({
        id: p.id,
        amount: p.amount,
        reference: p.reference,
        processedAt: p.processedAt?.toISOString() ?? null,
        mentor: sanitizeUserForPublic(p.mentor.user),
      })),
    },
  });
}

const paySchema = z.object({
  payoutId: z.string().min(1),
  reference: z.string().min(2).max(80),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsed = paySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const payout = await prisma.mentorPayoutRequest.findFirst({
    where: { id: parsed.data.payoutId, status: "REQUESTED" },
    include: { mentor: { select: { id: true, userId: true, pendingPayout: true } } },
  });

  if (!payout) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const ref = parsed.data.reference.trim();

  await prisma.$transaction([
    prisma.mentorPayoutRequest.update({
      where: { id: payout.id },
      data: { status: "PAID", reference: ref, processedAt: new Date() },
    }),
    prisma.mentor.update({
      where: { id: payout.mentorId },
      data: {
        pendingPayout: { decrement: payout.amount },
      },
    }),
  ]);

  await createNotification({
    userId: payout.mentor.userId,
    type: NotificationType.PAYOUT_PAID,
    title: "Payout processed",
    titleAr: "تم صرف المبلغ",
    message: `Your payout of SAR ${Math.round(payout.amount)} has been processed. Ref: ${ref}`,
    messageAr: `تم صرف ${Math.round(payout.amount)} ريال. المرجع: ${ref}`,
    link: "/dashboard/mentor/earnings",
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}
