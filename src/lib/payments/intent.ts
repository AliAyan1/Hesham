import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import type { PaymentMetadataInput } from "@/lib/payments/fulfill";

export async function createPaymentIntent(input: {
  userId: string;
  provider: PaymentProvider;
  metadata: PaymentMetadataInput;
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
}): Promise<{ id: string }> {
  const prisma = getPrisma();
  const row = await prisma.paymentIntent.create({
    data: {
      userId: input.userId,
      provider: input.provider,
      metadataJson: JSON.stringify(input.metadata),
      baseAmount: input.baseAmount,
      vatAmount: input.vatAmount,
      totalAmount: input.totalAmount,
      status: PaymentStatus.PENDING,
    },
    select: { id: true },
  });
  return row;
}

export async function attachExternalIdToIntent(
  intentId: string,
  externalId: string,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.paymentIntent.update({
    where: { id: intentId },
    data: { externalId },
  });
}

export async function findIntentByExternalId(
  provider: PaymentProvider,
  externalId: string,
) {
  const prisma = getPrisma();
  return prisma.paymentIntent.findFirst({
    where: { provider, externalId },
  });
}

export async function markIntentPaid(intentId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.paymentIntent.update({
    where: { id: intentId },
    data: { status: PaymentStatus.PAID },
  });
}

export function parseIntentMetadata(json: string): PaymentMetadataInput {
  return JSON.parse(json) as PaymentMetadataInput;
}
