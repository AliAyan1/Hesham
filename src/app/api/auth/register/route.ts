import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/db";
import type { ZodIssue } from "zod";
import { registerWithPlanSchema } from "@/lib/validations";
import type { ApiResponse, IUser } from "@/types";
import jwt from "jsonwebtoken";
import { getAuthSecret } from "@/lib/auth-secret";
import { tierFromPlan } from "@/lib/subscription";
import { UserRole, NotificationType } from "@prisma/client";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import { sendTransactionalEmail } from "@/lib/email/send-transactional";

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
    const subscriptionTier = tierFromPlan(plan);

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
      },
      select: { id: true, email: true, name: true, role: true },
    });

    if (role === UserRole.JOBSEEKER) {
      try {
        await createUserNotification({
          userId: user.id,
          type: NotificationType.ASSESSMENT_INVITE,
          title: "Complete your AI assessment",
          titleAr: "أكمل تقييمك الذكي",
          message:
            "Welcome to QudrahTech. Complete at least one AI assessment to unlock job applications and stand out to employers.",
          messageAr:
            "مرحبًا بك في قدرتك. أكمل تقييمًا ذكيًا واحدًا على الأقل لفتح التقديم على الوظائف.",
          link: "/dashboard/job-seeker/assessment",
        });
        await sendTransactionalEmail({
          to: user.email,
          subject: "Welcome — complete your QudrahTech assessment",
          html: `<p>Hi ${name || "there"},</p><p>Complete at least one AI assessment on QudrahTech to apply for jobs.</p><p><a href="${process.env.NEXTAUTH_URL ?? "https://qudrahtech.com"}/dashboard/job-seeker/assessment">Open assessments</a></p>`,
        });
      } catch (sideEffectErr) {
        console.error("[register] post-create welcome steps failed:", sideEffectErr);
      }
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
