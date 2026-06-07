import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/test — check whether ADMIN exists in the production database.
 */
export async function GET() {
  try {
    const prisma = getPrisma();
    await prisma.$connect();
    const user = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { email: true, password: true },
    });
    const totalUsers = await prisma.user.count();
    return NextResponse.json({
      adminExists: Boolean(user),
      adminEmail: user?.email ?? null,
      adminHasPassword: Boolean(user?.password),
      totalUsers,
    });
  } catch (error) {
    console.error("[auth/test] failed:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
