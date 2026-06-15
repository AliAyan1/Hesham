import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { resolveDbUserIdForSession } from "@/lib/resolve-session-user";
import {
  bnplMetadataSchema,
  normalizeBuyerPhone,
  startTabbySession,
} from "@/lib/payments/bnpl-session";
import { tabbyConfigured } from "@/lib/payments/provider-config";
import { PAYMENT_METADATA_STORAGE_KEY } from "@/components/payments/PaymentForm";

const bodySchema = z.object({
  metadata: bnplMetadataSchema,
  baseAmount: z.number().positive(),
  totalAmount: z.number().positive(),
  description: z.string().min(1),
  locale: z.string().min(2).max(5),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!tabbyConfigured()) {
    return NextResponse.json({ error: "Tabby not configured" }, { status: 503 });
  }

  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolved = await resolveDbUserIdForSession(session, request);
  if (!resolved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: resolved.id },
    select: { email: true, name: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { redirectUrl } = await startTabbySession({
      userId: resolved.id,
      buyer: {
        email: user.email,
        name: user.name?.trim() || user.email.split("@")[0] || "Customer",
        phone: normalizeBuyerPhone(null),
      },
      metadata: parsed.data.metadata,
      baseAmount: parsed.data.baseAmount,
      totalAmount: parsed.data.totalAmount,
      description: parsed.data.description,
      locale: parsed.data.locale,
    });

    return NextResponse.json({
      redirectUrl,
      storageKey: PAYMENT_METADATA_STORAGE_KEY,
      metadata: parsed.data.metadata,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "tabby_failed";
    return NextResponse.json(
      { error: "Tabby checkout failed", code: process.env.NODE_ENV === "production" ? undefined : msg },
      { status: 502 },
    );
  }
}
