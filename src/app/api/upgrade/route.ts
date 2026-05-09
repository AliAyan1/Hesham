import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { planParamSchema } from "@/lib/validations";
import { tierFromPlan } from "@/lib/subscription";
import type { ApiResponse } from "@/types";
import { upgradeWritesSubscriptionTier } from "@/lib/payments-config";

const bodySchema = z.object({
  plan: planParamSchema,
});

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ subscriptionTier: string }>>> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed" },
      { status: 400 },
    );
  }

  const prisma = getPrisma();

  if (!upgradeWritesSubscriptionTier()) {
    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true },
    });
    const tier = current?.subscriptionTier ?? "FREE";
    return NextResponse.json({
      success: true,
      data: { subscriptionTier: tier },
    });
  }

  const subscriptionTier = tierFromPlan(parsed.data.plan);

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      subscriptionTier,
      subscriptionStart: new Date(),
      subscriptionEnd: null,
    },
    select: { subscriptionTier: true },
  });

  return NextResponse.json({
    success: true,
    data: { subscriptionTier: user.subscriptionTier },
  });
}

