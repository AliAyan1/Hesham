import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/db";
import type { ZodIssue } from "zod";
import { registerWithPlanSchema } from "@/lib/validations";
import type { ApiResponse, IUser } from "@/types";
import jwt from "jsonwebtoken";
import { getAuthSecret } from "@/lib/auth-secret";
import { tierFromPlan } from "@/lib/subscription";
import { UserRole } from "@prisma/client";
import { onEmployerRegistered, onJobSeekerRegistered } from "@/lib/email-triggers";
import { defaultMentorProfileCreate } from "@/lib/mentor/default-mentor-create";

/**
 * POST /api/auth/register
 * Creates a new user account with hashed password and default profile.
 */
export async function POST(
  request: NextRequest
): Promise<
  NextResponse<
    ApiResponse<
      | {
          user: Pick<IUser, "id" | "email" | "name" | "role">;
          token: string;
        }
      | Pick<IUser, "id" | "email" | "name" | "role">
    >
  >
> {
  try {
    const prisma = getPrisma();
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
    const subscriptionTier =
      role === UserRole.MENTOR ? ("FREE" as const) : tierFromPlan(plan);

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

    const secret = getAuthSecret();
    if (!secret) {
      return NextResponse.json(
        {
          success: true,
          data: user,
          message:
            "Account created successfully. NEXTAUTH_SECRET is not set; JWT not issued.",
        },
        { status: 201 }
      );
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: "7d" }
    );

    return NextResponse.json(
      {
        success: true,
        data: { user, token },
        message: "Account created successfully",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
