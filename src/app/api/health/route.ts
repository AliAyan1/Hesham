import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function configured(key: string): string {
  const v = process.env[key]?.trim();
  return v ? "configured" : "MISSING";
}

/**
 * GET /api/health — production readiness probe (no secrets in response).
 */
export async function GET() {
  const checks: Record<string, string> = {};

  let dbLatencyMs: number | null = null;
  try {
    const prisma = getPrisma();
    const started = Date.now();
    await prisma.$connect();
    const userCount = await prisma.user.count();
    dbLatencyMs = Date.now() - started;
    checks.database = `connected (${userCount} users, ${dbLatencyMs}ms)`;
  } catch (error) {
    console.error("[health] database:", error);
    checks.database = "FAILED";
  }

  checks.nextauth =
    process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET ? "configured" : "MISSING";
  checks.openai = configured("OPENAI_API_KEY");
  checks.anthropic = configured("ANTHROPIC_API_KEY");
  checks.resend = configured("RESEND_API_KEY");
  checks.ngenius = configured("NGENIUS_API_KEY");
  checks.daily = configured("DAILY_API_KEY");

  const allOk = Object.values(checks).every(
    (v) => !v.includes("MISSING") && !v.includes("FAILED"),
  );

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      dbLatencyMs,
      checks,
    },
    { status: allOk ? 200 : 503 },
  );
}
