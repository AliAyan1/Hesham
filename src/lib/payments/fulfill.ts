import {
  ObligationStatus,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
  SessionStatus,
  SubscriptionTier,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { calculateVAT, fromHalalas, pollPaidPayment, toHalalas } from "@/lib/moyasar";
import {
  getSubscriptionPlanPrices,
  subscriptionBaseAmount,
} from "@/lib/payments/pricing-server";
import type { SubscriptionPlanKey } from "@/lib/payments/pricing";
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
    const prices = await getSubscriptionPlanPrices();
    if (!plan || !(plan in prices)) {
      throw new Error("invalid_plan");
    }
    const base = await subscriptionBaseAmount(plan);
    const { total } = calculateVAT(base, prices.vatPercentage);
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

async function recordPaymentAndFulfill(input: {
  userId: string;
  provider: PaymentProvider;
  externalPaymentId: string;
  metadata: PaymentMetadataInput;
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
  moyasarPaymentId?: string | null;
}): Promise<void> {
  const prisma = getPrisma();
  const paymentType = input.metadata.type as PaymentType;

  const existing = await prisma.payment.findFirst({
    where: {
      OR: [
        { externalPaymentId: input.externalPaymentId },
        ...(input.moyasarPaymentId
          ? [{ moyasarPaymentId: input.moyasarPaymentId }]
          : []),
      ],
      status: PaymentStatus.PAID,
    },
  });
  if (existing) return;

  await prisma.payment.create({
    data: {
      userId: input.userId,
      type: paymentType,
      provider: input.provider,
      subscriptionPlan: input.metadata.plan ?? null,
      obligationId: input.metadata.obligationId ?? null,
      sessionId: input.metadata.sessionId ?? null,
      amount: input.baseAmount,
      vatAmount: input.vatAmount,
      totalAmount: input.totalAmount,
      status: PaymentStatus.PAID,
      moyasarPaymentId: input.moyasarPaymentId ?? null,
      externalPaymentId: input.externalPaymentId,
      paidAt: new Date(),
    },
  });

  await applyPaymentFulfillment(input.userId, input.metadata, {
    baseAmount: input.baseAmount,
    totalAmount: input.totalAmount,
    externalPaymentId: input.externalPaymentId,
  });
}

async function applyPaymentFulfillment(
  userId: string,
  metadata: PaymentMetadataInput,
  amounts: { baseAmount: number; totalAmount: number; externalPaymentId: string },
): Promise<void> {
  const prisma = getPrisma();

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
        amount: amounts.baseAmount,
        vatAmount: Math.round((amounts.totalAmount - amounts.baseAmount) * 100) / 100,
        totalAmount: amounts.totalAmount,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        receiptNumber: amounts.externalPaymentId,
      },
      update: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        receiptNumber: amounts.externalPaymentId,
        amount: amounts.baseAmount,
        vatAmount: Math.round((amounts.totalAmount - amounts.baseAmount) * 100) / 100,
        totalAmount: amounts.totalAmount,
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
        amount: amounts.totalAmount,
        currency: obligation.currency,
        jobTitle: obligation.job.title,
        receiptNumber: amounts.externalPaymentId,
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

  await recordPaymentAndFulfill({
    userId,
    provider: PaymentProvider.MOYASAR,
    externalPaymentId: paymentId,
    metadata,
    baseAmount,
    vatAmount,
    totalAmount,
    moyasarPaymentId: paymentId,
  });
}

export async function verifyAndFulfillTabbyPayment(
  userId: string,
  paymentId: string,
): Promise<void> {
  const { getTabbyPayment, captureTabbyPayment, tabbyIsPaid } = await import(
    "@/lib/payments/tabby"
  );
  const {
    findIntentByExternalId,
    markIntentPaid,
    parseIntentMetadata,
  } = await import("@/lib/payments/intent");

  const intent = await findIntentByExternalId(PaymentProvider.TABBY, paymentId);
  if (!intent || intent.userId !== userId) throw new Error("intent_not_found");

  const remote = await getTabbyPayment(paymentId);
  if (!tabbyIsPaid(remote.status)) throw new Error("payment_not_paid");

  if (remote.status === "AUTHORIZED") {
    await captureTabbyPayment(paymentId);
  }

  const remoteAmount = parseFloat(remote.amount);
  if (Math.abs(remoteAmount - intent.totalAmount) > 0.02) {
    throw new Error("amount_mismatch");
  }

  const metadata = parseIntentMetadata(intent.metadataJson);

  await recordPaymentAndFulfill({
    userId,
    provider: PaymentProvider.TABBY,
    externalPaymentId: paymentId,
    metadata,
    baseAmount: intent.baseAmount,
    vatAmount: intent.vatAmount,
    totalAmount: intent.totalAmount,
  });

  await markIntentPaid(intent.id);
}

export async function verifyAndFulfillTamaraPayment(
  userId: string,
  orderId: string,
): Promise<void> {
  const { getTamaraOrder, authoriseTamaraOrder, tamaraIsApproved } = await import(
    "@/lib/payments/tamara"
  );
  const {
    findIntentByExternalId,
    markIntentPaid,
    parseIntentMetadata,
  } = await import("@/lib/payments/intent");

  const intent = await findIntentByExternalId(PaymentProvider.TAMARA, orderId);
  if (!intent || intent.userId !== userId) throw new Error("intent_not_found");

  const remote = await getTamaraOrder(orderId);
  if (!tamaraIsApproved(remote.status)) throw new Error("payment_not_paid");

  await authoriseTamaraOrder(orderId);

  const remoteAmount = remote.total_amount?.amount;
  if (remoteAmount != null && Math.abs(remoteAmount - intent.totalAmount) > 0.02) {
    throw new Error("amount_mismatch");
  }

  const metadata = parseIntentMetadata(intent.metadataJson);

  await recordPaymentAndFulfill({
    userId,
    provider: PaymentProvider.TAMARA,
    externalPaymentId: orderId,
    metadata,
    baseAmount: intent.baseAmount,
    vatAmount: intent.vatAmount,
    totalAmount: intent.totalAmount,
  });

  await markIntentPaid(intent.id);
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
