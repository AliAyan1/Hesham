import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — verify DATABASE_URL and Prisma connectivity on Vercel/production.
 */
export async function GET() {
  try {
    const prisma = getPrisma();
    await prisma.$connect();
    const userCount = await prisma.user.count();
    return NextResponse.json({
      status: "ok",
      db: "connected",
      users: userCount,
    });
  } catch (error) {
    console.error("[health] db check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        error: String(error),
      },
      { status: 500 },
    );
  }
}
