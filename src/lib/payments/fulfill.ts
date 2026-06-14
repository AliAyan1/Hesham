import {
  ObligationStatus,
  PaymentStatus,
  PaymentType,
  SessionStatus,
  SubscriptionTier,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { calculateVAT, fromHalalas, pollPaidPayment, toHalalas } from "@/lib/moyasar";
import { subscriptionBaseAmount, SUBSCRIPTION_PLAN_PRICES_SAR, type SubscriptionPlanKey } from "@/lib/payments/pricing";
import { createDailyRoomForSession } from "@/lib/daily/client";
import { ensureMentorMessageThread } from "@/lib/mentor/session-access";
import { onMentorSessionConfirmed } from "@/lib/mentor/notifications";
import { onPaymentConfirmed } from "@/lib/email-triggers";

export type PaymentMetadataInput = {
  type: "SUBSCRIPTION" | "RECRUITMENT_FEE" | "MENTOR_SESSION";
  plan?: string;
  obligationId?: string;
  sessionId?: string;
};

async function resolveExpectedTotalHalalas(metadata: PaymentMetadataInput): Promise<number> {
  if (metadata.type === "SUBSCRIPTION") {
    const plan = metadata.plan?.toUpperCase() as SubscriptionPlanKey | undefined;
    if (!plan || !(plan in SUBSCRIPTION_PLAN_PRICES_SAR)) {
      throw new Error("invalid_plan");
    }
    const { total } = calculateVAT(subscriptionBaseAmount(plan));
    return toHalalas(total);
  }

  const prisma = getPrisma();

  if (metadata.type === "RECRUITMENT_FEE") {
    if (!metadata.obligationId) throw new Error("missing_obligation");
    const row = await prisma.obligationLetter.findUnique({
      where: { id: metadata.obligationId },
      select: { recruitmentFee: true },
    });
    if (!row) throw new Error("obligation_not_found");
    const { total } = calculateVAT(row.recruitmentFee);
    return toHalalas(total);
  }

  if (metadata.type === "MENTOR_SESSION") {
    if (!metadata.sessionId) throw new Error("missing_session");
    const row = await prisma.mentorSession.findUnique({
      where: { id: metadata.sessionId },
      select: { price: true },
    });
    if (!row) throw new Error("session_not_found");
    const { total } = calculateVAT(row.price);
    return toHalalas(total);
  }

  throw new Error("invalid_type");
}

export async function verifyAndFulfillPayment(
  userId: string,
  paymentId: string,
  metadata: PaymentMetadataInput,
): Promise<void> {
  const prisma = getPrisma();

  const existing = await prisma.payment.findUnique({
    where: { moyasarPaymentId: paymentId },
  });
  if (existing?.status === PaymentStatus.PAID) {
    return;
  }

  const remote = await pollPaidPayment(paymentId);

  const expectedHalalas = await resolveExpectedTotalHalalas(metadata);
  if (Math.abs(remote.amount - expectedHalalas) > 1) {
    throw new Error("amount_mismatch");
  }

  const totalAmount = fromHalalas(remote.amount);
  const baseAmount = Math.round((totalAmount / 1.15) * 100) / 100;
  const vatAmount = Math.round((totalAmount - baseAmount) * 100) / 100;

  const paymentType = metadata.type as PaymentType;

  await prisma.payment.upsert({
    where: { moyasarPaymentId: paymentId },
    create: {
      userId,
      type: paymentType,
      subscriptionPlan: metadata.plan ?? null,
      obligationId: metadata.obligationId ?? null,
      sessionId: metadata.sessionId ?? null,
      amount: baseAmount,
      vatAmount,
      totalAmount,
      status: PaymentStatus.PAID,
      moyasarPaymentId: paymentId,
      paidAt: new Date(),
    },
    update: {
      status: PaymentStatus.PAID,
      paidAt: new Date(),
    },
  });

  if (metadata.type === "SUBSCRIPTION") {
    const tier =
      metadata.plan?.toUpperCase() === "PREMIUM"
        ? SubscriptionTier.PREMIUM
        : metadata.plan?.toUpperCase() === "PROFESSIONAL"
          ? SubscriptionTier.PROFESSIONAL
          : null;
    if (!tier) throw new Error("invalid_plan");

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: tier,
        subscriptionStart: new Date(),
        subscriptionEnd: null,
      },
    });
    return;
  }

  if (metadata.type === "RECRUITMENT_FEE") {
    if (!metadata.obligationId) throw new Error("missing_obligation");

    const obligation = await prisma.obligationLetter.findFirst({
      where: { id: metadata.obligationId, employerId: userId },
      include: { job: { select: { title: true } } },
    });
    if (!obligation) throw new Error("obligation_forbidden");

    await prisma.obligationLetter.update({
      where: { id: metadata.obligationId },
      data: {
        status: ObligationStatus.SIGNED,
        signedAt: obligation.signedAt ?? new Date(),
      },
    });

    await prisma.recruitmentPayment.upsert({
      where: { obligationId: metadata.obligationId },
      create: {
        obligationId: metadata.obligationId,
        employerId: userId,
        amount: baseAmount,
        vatAmount,
        totalAmount,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        receiptNumber: paymentId,
      },
      update: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        receiptNumber: paymentId,
        amount: baseAmount,
        vatAmount,
        totalAmount,
      },
    });

    const employer = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (employer?.email) {
      await onPaymentConfirmed({
        employerId: userId,
        employerEmail: employer.email,
        amount: totalAmount,
        currency: obligation.currency,
        jobTitle: obligation.job.title,
        receiptNumber: paymentId,
      });
    }
    return;
  }

  if (metadata.type === "MENTOR_SESSION") {
    if (!metadata.sessionId) throw new Error("missing_session");

    const row = await prisma.mentorSession.findFirst({
      where: { id: metadata.sessionId, menteeId: userId, status: SessionStatus.PENDING },
      include: {
        mentor: { include: { user: { select: { name: true } } } },
      },
    });
    if (!row || !row.scheduledAt) throw new Error("session_forbidden");

    const room = await createDailyRoomForSession(row.id, row.duration);

    await prisma.mentorSession.update({
      where: { id: row.id },
      data: {
        status: SessionStatus.CONFIRMED,
        dailyRoomName: room.roomName,
        dailyRoomUrl: room.roomUrl,
      },
    });

    await ensureMentorMessageThread(row.id);

    await onMentorSessionConfirmed({
      menteeUserId: row.menteeId,
      mentorName: row.mentor.user.name ?? "Mentor",
      scheduledAt: row.scheduledAt,
      sessionId: row.id,
    });
  }
}

export type PaymentHistoryRow = {
  id: string;
  type: PaymentType;
  description: string;
  totalAmount: number;
  currency: string;
  status: PaymentStatus;
  moyasarPaymentId: string | null;
  paidAt: string | null;
  createdAt: string;
};

export async function listPaymentHistory(userId: string): Promise<PaymentHistoryRow[]> {
  const prisma = getPrisma();
  const rows = await prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    description: paymentDescription(row),
    totalAmount: row.totalAmount,
    currency: row.currency,
    status: row.status,
    moyasarPaymentId: row.moyasarPaymentId,
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

function paymentDescription(row: {
  type: PaymentType;
  subscriptionPlan: string | null;
}): string {
  if (row.type === PaymentType.SUBSCRIPTION) {
    return `Subscription — ${row.subscriptionPlan ?? "Plan"}`;
  }
  if (row.type === PaymentType.RECRUITMENT_FEE) {
    return "Recruitment fee";
  }
  if (row.type === PaymentType.MENTOR_SESSION) {
    return "Mentor session";
  }
  return row.type;
}
