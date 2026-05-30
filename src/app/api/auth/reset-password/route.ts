import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getPrisma } from "@/lib/db";
import { consumePasswordResetToken } from "@/lib/auth/password-reset-token";

const bodySchema = z.object({
  token: z.string().min(16),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const consumed = await consumePasswordResetToken(parsed.data.token);
  if (!consumed) {
    return NextResponse.json(
      { success: false, error: "Invalid or expired reset link" },
      { status: 400 },
    );
  }

  const hashed = await bcrypt.hash(parsed.data.password, 12);
  const prisma = getPrisma();
  await prisma.user.update({
    where: { id: consumed.userId },
    data: { password: hashed },
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}
