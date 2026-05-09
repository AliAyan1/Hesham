import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/db";
import { registerWithPlanSchema } from "@/lib/validations";
import type { ApiResponse, IUser } from "@/types";
import jwt from "jsonwebtoken";
import { getAuthSecret } from "@/lib/auth-secret";
import { tierFromPlan } from "@/lib/subscription";
import { UserRole } from "@prisma/client";

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
          message: parsed.error.issues.map((e) => e.message).join(", "),
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
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
