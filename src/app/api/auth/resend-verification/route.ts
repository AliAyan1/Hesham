import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma, isPrismaConnectionError } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";
import {
  generateVerificationCode,
  isEmailVerified,
  verificationCodeExpiresAt,
} from "@/lib/email-verification";
import { sendEmailVerificationCode } from "@/lib/email-triggers";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: true, message: "If the account exists, a code was sent." });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const ip = clientIp(request);
    const limited = rateLimit(`resend-verify:${email}`, 3, 60 * 60 * 1000);
    if (!limited.ok) {
      return rateLimitResponse(limited.retryAfterSec);
    }
    rateLimit(`resend-verify-ip:${ip}`, 10, 60 * 60 * 1000);

    const prisma = getPrisma();
    const user = await withDbRetry(() =>
      prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, email: true, name: true, emailVerified: true },
      }),
    );

    if (!user || isEmailVerified(user.emailVerified)) {
      return NextResponse.json({
        success: true,
        message: "If the account exists, a code was sent.",
      });
    }

    const code = generateVerificationCode();
    await withDbRetry(() =>
      prisma.user.update({
        where: { id: user.id },
        data: {
          verificationCode: code,
          verificationCodeExpiry: verificationCodeExpiresAt(),
        },
      }),
    );

    await sendEmailVerificationCode({
      email: user.email,
      name: user.name || "there",
      code,
    });

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
    });
  } catch (err) {
    console.error("[resend-verification]", err);
    const isDb = isPrismaConnectionError(err);
    return NextResponse.json(
      {
        success: false,
        error: isDb ? "Database connection failed" : "Could not resend code",
        code: isDb ? "database_unavailable" : undefined,
      },
      { status: isDb ? 503 : 500 },
    );
  }
}
