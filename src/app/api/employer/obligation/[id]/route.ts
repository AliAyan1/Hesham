import { ObligationStatus, PaymentStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { isTestingMode } from "@/lib/testing-mode";

const signSchema = z.object({
  signedByName: z.string().min(2).max(120),
});

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const prisma = getPrisma();
  const row = await prisma.obligationLetter.findFirst({
    where: { id, employerId: session.user.id },
    include: {
      candidate: { select: { name: true, email: true } },
      job: { select: { title: true } },
      payment: true,
    },
  });
  if (!row) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  const vat = row.recruitmentFee * 0.15;
  return NextResponse.json({
    success: true,
    data: {
      ...row,
      vatAmount: vat,
      totalAmount: row.recruitmentFee + vat,
    },
  });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const parsed = signSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const row = await prisma.obligationLetter.findFirst({
    where: { id, employerId: session.user.id, status: ObligationStatus.PENDING },
    include: {
      candidate: { select: { name: true } },
      job: { select: { title: true } },
      payment: true,
    },
  });
  if (!row) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const vat = row.recruitmentFee * 0.15;
  const total = row.recruitmentFee + vat;
  const skipPayment = isTestingMode(); // TESTING MODE - REVERT BEFORE LAUNCH

  await prisma.obligationLetter.update({
    where: { id },
    data: {
      signedAt: new Date(),
      signedByName: parsed.data.signedByName,
      ...(skipPayment ? { status: ObligationStatus.SIGNED } : {}),
    },
  });

  await prisma.recruitmentPayment.upsert({
    where: { obligationId: id },
    create: {
      obligationId: id,
      employerId: session.user.id,
      amount: row.recruitmentFee,
      vatAmount: vat,
      totalAmount: total,
      status: skipPayment ? PaymentStatus.PAID : PaymentStatus.PENDING,
      ...(skipPayment ? { paidAt: new Date() } : {}),
    },
    update: {
      amount: row.recruitmentFee,
      vatAmount: vat,
      totalAmount: total,
      ...(skipPayment
        ? { status: PaymentStatus.PAID, paidAt: new Date() }
        : {}),
    },
  });

  await logAudit({
    userId: session.user.id,
    action: skipPayment ? "obligation.signed_testing_mode" : "obligation.signed_pending_payment",
    entity: "ObligationLetter",
    entityId: id,
  });

  return NextResponse.json({
    success: true,
    data: {
      obligationId: id,
      recruitmentFee: row.recruitmentFee,
      totalAmount: total,
      candidateName: row.candidate.name,
      jobTitle: row.job.title,
    },
  });
}
