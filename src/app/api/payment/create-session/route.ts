import { PaymentProvider } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createPaymentSession, NgeniusApiError, ngeniusConfigured } from "@/lib/ngenius";
import { getServerSession } from "@/lib/get-server-session";
import { resolveDbUserIdForSession } from "@/lib/resolve-session-user";
import { bnplMetadataSchema } from "@/lib/payments/bnpl-session";
import type { PaymentMetadataInput } from "@/lib/payments/fulfill";
import {
  attachExternalIdToIntent,
  createPaymentIntent,
} from "@/lib/payments/intent";
import { calculateVAT } from "@/lib/payments/vat";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const bodySchema = z.object({
  amount: z.number().positive(),
  planId: z.string().optional(),
  metadata: bnplMetadataSchema.optional(),
  locale: z.string().min(2).max(5).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!ngeniusConfigured()) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolved = await resolveDbUserIdForSession(session, request);
  if (!resolved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit(
    `ngenius-session:${resolved.id}:${clientIp(request)}`,
    15,
    60 * 60 * 1000,
  );
  if (!limited.ok) {
    return rateLimitResponse(limited.retryAfterSec);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const email = session.user.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Account email required" }, { status: 400 });
  }

  const metadataInput: PaymentMetadataInput = parsed.data.metadata ?? {
    type: "SUBSCRIPTION",
    plan: parsed.data.planId,
  };

  if (metadataInput.type === "SUBSCRIPTION" && !metadataInput.plan && parsed.data.planId) {
    metadataInput.plan = parsed.data.planId;
  }

  const totalAmount = parsed.data.amount;
  const baseAmount = Math.round((totalAmount / 1.15) * 100) / 100;
  const { vat: vatAmount } = calculateVAT(baseAmount);

  const orderId = `QT-${Date.now()}`;
  const locale = parsed.data.locale ?? "ar";

  const intent = await createPaymentIntent({
    userId: resolved.id,
    provider: PaymentProvider.MOYASAR,
    metadata: {
      ...metadataInput,
      merchantOrderReference: orderId,
      locale,
    },
    baseAmount,
    vatAmount,
    totalAmount,
  });

  try {
    const { paymentUrl, orderReference } = await createPaymentSession(
      totalAmount,
      orderId,
      email,
    );

    if (orderReference) {
      await attachExternalIdToIntent(intent.id, orderReference);
    }

    return NextResponse.json({ paymentUrl, orderId });
  } catch (err) {
    console.error("[payment/create-session] failed:", err);
    if (err instanceof NgeniusApiError) {
      return NextResponse.json(
        {
          error: "Could not start payment",
          code: err.code,
          ...(process.env.NODE_ENV !== "production" ? { hint: err.hint, status: err.status } : {}),
        },
        { status: err.status === 403 ? 503 : 502 },
      );
    }
    return NextResponse.json({ error: "Could not start payment" }, { status: 502 });
  }
}
