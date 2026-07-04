import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const results: Record<string, string> = {};

  try {
    const prisma = getPrisma();
    await prisma.$connect();
    results.database = "connected";
    results.users = String(await prisma.user.count());
    results.jobs = String(await prisma.job.count());
    results.assessments = String(await prisma.assessment.count());
    results.applications = String(await prisma.application.count());
  } catch (error) {
    results.database = `FAILED: ${String(error)}`;
  }

  return NextResponse.json({
    status: results.database === "connected" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    checks: results,
  });
}
