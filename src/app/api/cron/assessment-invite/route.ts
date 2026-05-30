import { NextResponse } from "next/server";
import { AssessmentStatus, UserRole } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { onAssessmentInviteDelayed } from "@/lib/email-triggers";

/** Sends assessment invite to job seekers who registered 1–2 hours ago. */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const now = Date.now();
  const from = new Date(now - 2 * 60 * 60 * 1000);
  const to = new Date(now - 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: {
      role: UserRole.JOBSEEKER,
      welcomeEmailSentAt: { not: null },
      createdAt: { gte: from, lte: to },
    },
    select: { id: true, email: true, name: true },
    take: 100,
  });

  let sent = 0;
  for (const u of users) {
    const hasAssessment = await prisma.assessment.findFirst({
      where: { userId: u.id, status: AssessmentStatus.COMPLETED },
      select: { id: true },
    });
    if (hasAssessment) continue;
    await onAssessmentInviteDelayed({ userId: u.id, email: u.email, name: u.name ?? "there" });
    sent += 1;
  }

  return NextResponse.json({ success: true, data: { sent } });
}
