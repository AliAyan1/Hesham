import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/db";
import type { ZodIssue } from "zod";
import { registerWithPlanSchema } from "@/lib/validations";
import type { ApiResponse, IUser } from "@/types";
import { tierFromPlan } from "@/lib/subscription";
import { UserRole } from "@prisma/client";
import { onEmployerRegistered, onJobSeekerRegistered } from "@/lib/email-triggers";
import { defaultMentorProfileCreate } from "@/lib/mentor/default-mentor-create";
import { paymentsAreLive } from "@/lib/payments-config";
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
    const limited = rateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
    if (!limited.ok) {
      return rateLimitResponse(limited.retryAfterSec);
    }

    const prisma = getPrisma();
    await prisma.$connect();

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

    const { name, email, password, role, plan } = parsed.data;
    console.log("[register] attempt:", email, "role:", role, "plan:", plan ?? "none");
    let subscriptionTier =
      role === UserRole.MENTOR ? ("FREE" as const) : tierFromPlan(plan);

    if (paymentsAreLive() && subscriptionTier !== "FREE") {
      return NextResponse.json(
        {
          success: false,
          error: "Paid plans require checkout before account creation",
        },
        { status: 402 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        subscriptionTier,
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
    });

    try {
      if (role === UserRole.JOBSEEKER) {
        await onJobSeekerRegistered({ userId: user.id, email: user.email, name: name || "there" });
      } else if (role === UserRole.EMPLOYER) {
        await onEmployerRegistered({ userId: user.id, email: user.email, name: name || "there" });
      } else if (role === UserRole.MENTOR) {
        const { notifyAdminsNewMentorApplication } = await import("@/lib/mentor/notifications");
        await notifyAdminsNewMentorApplication({
          mentorName: name || user.email,
          mentorUserId: user.id,
        });
      }
    } catch (sideEffectErr) {
      console.error("[register] welcome email failed:", sideEffectErr);
    }

    return NextResponse.json(
      {
        success: true,
        data: user,
        message: "Account created successfully",
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[register] error:", err);
    const message = err instanceof Error ? err.message : String(err);
    const isDb =
      message.includes("DATABASE_URL") ||
      message.includes("connect") ||
      message.includes("ECONNREFUSED");
    return NextResponse.json(
      {
        success: false,
        error: isDb ? "Database connection failed" : "Registration failed",
        message: process.env.NODE_ENV === "production" ? undefined : message,
      },
      { status: 500 },
    );
  }
}
