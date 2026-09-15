import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/test — dev-only admin presence check (disabled in production).
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const prisma = getPrisma();
    await prisma.$connect();
    const user = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { email: true },
    });
    const totalUsers = await prisma.user.count();
    return NextResponse.json({
      adminExists: Boolean(user),
      adminEmail: user?.email ?? null,
      totalUsers,
    });
  } catch (error) {
    console.error("[auth/test] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
