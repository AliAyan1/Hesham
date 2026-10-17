import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getPrisma, isPrismaConnectionError } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";
import { isVerificationCodeValid } from "@/lib/email-verification";
import { onEmployerRegistered, onJobSeekerRegistered } from "@/lib/email-triggers";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const ip = clientIp(request);
    const limited = rateLimit(`verify-email:${ip}`, 20, 60 * 60 * 1000);
    if (!limited.ok) {
      return rateLimitResponse(limited.retryAfterSec);
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired code" },
        { status: 400 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const code = parsed.data.code.replace(/\D/g, "");

    const prisma = getPrisma();
    const user = await withDbRetry(() =>
      prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          verificationCode: true,
          verificationCodeExpiry: true,
        },
      }),
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired code" },
        { status: 400 },
      );
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        role: user.role,
      });
    }

    if (
      !isVerificationCodeValid(
        user.verificationCode,
        user.verificationCodeExpiry,
        code,
      )
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired code" },
        { status: 400 },
      );
    }

    await withDbRetry(() =>
      prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
          verificationCode: null,
          verificationCodeExpiry: null,
        },
      }),
    );

    try {
      const displayName = user.name || "there";
      if (user.role === UserRole.JOBSEEKER) {
        await onJobSeekerRegistered({
          userId: user.id,
          email: user.email,
          name: displayName,
        });
      } else if (user.role === UserRole.EMPLOYER) {
        await onEmployerRegistered({
          userId: user.id,
          email: user.email,
          name: displayName,
        });
      } else if (user.role === UserRole.MENTOR) {
        const { notifyAdminsNewMentorApplication } = await import(
          "@/lib/mentor/notifications"
        );
        await notifyAdminsNewMentorApplication({
          mentorName: displayName,
          mentorUserId: user.id,
        });
      }
    } catch (sideEffectErr) {
      console.error("[verify-email] welcome side effects failed:", sideEffectErr);
    }

    return NextResponse.json({ success: true, role: user.role });
  } catch (err) {
    console.error("[verify-email]", err);
    const isDb = isPrismaConnectionError(err);
    return NextResponse.json(
      {
        success: false,
        error: isDb ? "Database connection failed" : "Verification failed",
        code: isDb ? "database_unavailable" : undefined,
      },
      { status: isDb ? 503 : 500 },
    );
  }
}
