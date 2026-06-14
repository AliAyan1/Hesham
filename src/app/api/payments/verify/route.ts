import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { resolveDbUserIdForSession } from "@/lib/resolve-session-user";
import { verifyAndFulfillPayment } from "@/lib/payments/fulfill";

const bodySchema = z.object({
  paymentId: z.string().min(1),
  metadata: z.object({
    type: z.enum(["SUBSCRIPTION", "RECRUITMENT_FEE", "MENTOR_SESSION"]),
    plan: z.string().optional(),
    obligationId: z.string().optional(),
    sessionId: z.string().optional(),
  }),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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

    await verifyAndFulfillPayment(
      resolved.id,
      parsed.data.paymentId,
      parsed.data.metadata,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const code = err instanceof Error ? err.message : "unknown";
    const status =
      code === "payment_not_paid" || code === "payment_failed"
        ? 402
        : code === "amount_mismatch" || code === "invalid_plan"
          ? 400
          : 500;
    return NextResponse.json(
      {
        error: "Verification failed",
        code: process.env.NODE_ENV === "production" ? undefined : code,
      },
      { status },
    );
  }
}
