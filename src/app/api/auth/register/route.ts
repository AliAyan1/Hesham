import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPrisma, isPrismaConnectionError } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";
import type { ZodIssue } from "zod";
import { registerWithPlanSchema } from "@/lib/validations";
import type { ApiResponse, IUser } from "@/types";
import { UserRole } from "@prisma/client";
import { sendEmailVerificationCode } from "@/lib/email-triggers";
import {
  generateVerificationCode,
  verificationCodeExpiresAt,
} from "@/lib/email-verification";
import { isRegistrationOpen as getRegistrationOpen } from "@/lib/settings";
import { defaultMentorProfileCreate } from "@/lib/mentor/default-mentor-create";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * POST /api/auth/register
 * Creates a new user account with hashed password and default profile.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const ip = clientIp(request);
    const limited = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
    if (!limited.ok) {
      return rateLimitResponse(limited.retryAfterSec);
    }

    const prisma = getPrisma();
    await withDbRetry(() => prisma.$connect());

    if (!(await withDbRetry(() => getRegistrationOpen()))) {
      return NextResponse.json(
        { success: false, error: "Registration is currently closed" },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const parsed = registerWithPlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          message: parsed.error.issues.map((e: ZodIssue) => e.message).join(", "),
        },
        { status: 400 }
      );
    }

    const { name, email, password, role } = parsed.data;

    // REVERTED - payment required to upgrade. All new accounts start as FREE.
    // Plan upgrades only AFTER payment success via /api/payments/verify.
    const subscriptionTier = "FREE" as const;

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await withDbRetry(() =>
      prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      }),
    );
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationCode = generateVerificationCode();
    const verificationCodeExpiry = verificationCodeExpiresAt();

    const user = await withDbRetry(() =>
      prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role,
        subscriptionTier,
        emailVerified: null,
        verificationCode,
        verificationCodeExpiry,
        /** First-run wizard; middleware sends users to `/onboarding` until completed. */
        onboardingComplete: false,
        subscriptionStart: subscriptionTier === "FREE" ? null : new Date(),
        profile:
          role === UserRole.JOBSEEKER
            ? {
                create: { language: "ar" },
              }
            : undefined,
        employerProfile:
          role === UserRole.EMPLOYER
            ? {
                create: {},
              }
            : undefined,
        mentorProfile:
          role === UserRole.MENTOR
            ? {
                create: defaultMentorProfileCreate,
              }
            : undefined,
      },
      select: { id: true, email: true, name: true, role: true },
    }),
    );

    try {
      await sendEmailVerificationCode({
        email: user.email,
        name: name || "there",
        code: verificationCode,
      });
    } catch (sideEffectErr) {
      console.error("[register] verification email failed:", sideEffectErr);
      return NextResponse.json(
        {
          success: false,
          error: "Could not send verification email. Please try again.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: user,
        message: "Verification code sent to your email",
        verifyEmail: true,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[register] error:", err);
    const isDb = isPrismaConnectionError(err);
    return NextResponse.json(
      {
        success: false,
        error: isDb ? "Database connection failed" : "Registration failed",
        code: isDb ? "database_unavailable" : undefined,
        message:
          process.env.NODE_ENV === "production"
            ? undefined
            : err instanceof Error
              ? err.message
              : String(err),
      },
      { status: isDb ? 503 : 500 },
    );
  }
}
