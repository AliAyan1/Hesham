import { PaymentProvider } from "@prisma/client";
import { z } from "zod";
import { appOrigin } from "@/lib/payments/provider-config";
import {
  attachExternalIdToIntent,
  createPaymentIntent,
} from "@/lib/payments/intent";
import { createTabbyCheckoutSession } from "@/lib/payments/tabby";
import { createTamaraCheckoutSession } from "@/lib/payments/tamara";
import type { PaymentMetadataInput } from "@/lib/payments/fulfill";
import { calculateVAT } from "@/lib/moyasar";

export const bnplMetadataSchema = z.object({
  type: z.enum(["SUBSCRIPTION", "RECRUITMENT_FEE", "MENTOR_SESSION"]),
  plan: z.string().optional(),
  obligationId: z.string().optional(),
  sessionId: z.string().optional(),
});

export type BnplBuyer = {
  email: string;
  name: string;
  phone: string;
};

export async function startTabbySession(input: {
  userId: string;
  buyer: BnplBuyer;
  metadata: PaymentMetadataInput;
  baseAmount: number;
  totalAmount: number;
  description: string;
  locale: string;
}): Promise<{ redirectUrl: string }> {
  const { vat } = calculateVAT(input.baseAmount);
  const intent = await createPaymentIntent({
    userId: input.userId,
    provider: PaymentProvider.TABBY,
    metadata: input.metadata,
    baseAmount: input.baseAmount,
    vatAmount: vat,
    totalAmount: input.totalAmount,
  });

  const origin = appOrigin();
  const lang = input.locale === "ar" ? "ar" : "en";
  const callbackBase = `${origin}/api/payments/tabby/callback`;

  const { paymentId, webUrl } = await createTabbyCheckoutSession({
    amount: input.totalAmount,
    currency: "SAR",
    description: input.description,
    buyerEmail: input.buyer.email,
    buyerName: input.buyer.name,
    buyerPhone: input.buyer.phone,
    orderReferenceId: intent.id,
    lang,
    merchantUrls: {
      success: `${callbackBase}?status=success`,
      cancel: `${callbackBase}?status=cancel`,
      failure: `${callbackBase}?status=failure`,
    },
  });

  await attachExternalIdToIntent(intent.id, paymentId);

  return { redirectUrl: webUrl };
}

export async function startTamaraSession(input: {
  userId: string;
  buyer: BnplBuyer;
  metadata: PaymentMetadataInput;
  baseAmount: number;
  totalAmount: number;
  description: string;
  locale: string;
}): Promise<{ redirectUrl: string }> {
  const { vat } = calculateVAT(input.baseAmount);
  const intent = await createPaymentIntent({
    userId: input.userId,
    provider: PaymentProvider.TAMARA,
    metadata: input.metadata,
    baseAmount: input.baseAmount,
    vatAmount: vat,
    totalAmount: input.totalAmount,
  });

  const origin = appOrigin();
  const callbackBase = `${origin}/api/payments/tamara/callback`;

  const [firstName, ...rest] = input.buyer.name.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName;

  const { orderId, checkoutUrl } = await createTamaraCheckoutSession({
    orderReferenceId: intent.id,
    description: input.description,
    totalAmount: input.totalAmount,
    taxAmount: vat,
    currency: "SAR",
    consumerEmail: input.buyer.email,
    consumerFirstName: firstName,
    consumerLastName: lastName,
    consumerPhone: input.buyer.phone.replace(/^\+/, ""),
    locale: input.locale,
    merchantUrls: {
      success: `${callbackBase}?status=success`,
      failure: `${callbackBase}?status=failure`,
      cancel: `${callbackBase}?status=cancel`,
      notification: `${origin}/api/payments/tamara/webhook`,
    },
  });

  await attachExternalIdToIntent(intent.id, orderId);

  return { redirectUrl: checkoutUrl };
}

export function normalizeBuyerPhone(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("966") && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith("05") && digits.length === 10) return `+966${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("5")) return `+966${digits}`;
  return "+966500000000";
}
