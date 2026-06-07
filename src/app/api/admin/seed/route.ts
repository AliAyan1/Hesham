import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "admin@basalim-consulting.com";
const ADMIN_PASSWORD = "Admin@QudrahTech2026!";

function seedSecret(): string | undefined {
  const s = process.env.ADMIN_SEED_SECRET ?? process.env.CRON_SECRET;
  return typeof s === "string" && s.length > 0 ? s : undefined;
}

/**
 * GET /api/admin/seed?secret=... — one-time production admin bootstrap.
 * DELETE this route after seeding, or leave ADMIN_SEED_SECRET unset in production.
 */
export async function GET(request: NextRequest) {
  const expected = seedSecret();
  const provided = request.nextUrl.searchParams.get("secret") ?? "";

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prisma = getPrisma();
    await prisma.$connect();
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const admin = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        password: hashedPassword,
        role: "ADMIN",
        onboardingComplete: true,
      },
      create: {
        name: "QudrahTech Admin",
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: "ADMIN",
        subscriptionTier: "PREMIUM",
        emailVerified: new Date(),
        onboardingComplete: true,
      },
      select: { id: true, email: true, role: true },
    });

    return NextResponse.json({
      success: true,
      message: "Admin created or updated",
      email: admin.email,
      role: admin.role,
    });
  } catch (error) {
    console.error("[admin/seed] failed:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
