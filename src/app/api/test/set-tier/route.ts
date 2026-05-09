import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  tier: z.enum(["FREE", "PROFESSIONAL", "PREMIUM"]),
});

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ tier: string }>>> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      subscriptionTier: parsed.data.tier,
      subscriptionStart: parsed.data.tier === "FREE" ? null : new Date(),
      subscriptionEnd: null,
    },
    select: { subscriptionTier: true },
  });

  return NextResponse.json({ success: true, data: { tier: user.subscriptionTier } });
}

