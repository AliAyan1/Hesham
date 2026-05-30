import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/auth/password-reset-token";
import { onPasswordReset } from "@/lib/email-triggers";

const bodySchema = z.object({
  email: z.string().email(),
});

/** Always returns success to avoid email enumeration. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, password: true },
  });

  if (user?.password) {
    const token = await createPasswordResetToken(user.id);
    void onPasswordReset({ email: user.email, token });
  }

  return NextResponse.json({
    success: true,
    data: { message: "If an account exists, a reset link was sent." },
  });
}
