import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { computeProfileCompletionPercent } from "@/lib/profile-completion";
import type { JobSeekerDashboardPayload } from "@/types/dashboard";
import { computeCvCompletionPercent } from "@/lib/cv/completion";
import { resolveJobSeekerDbUserForUpload } from "@/lib/resolve-session-user";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<JobSeekerDashboardPayload | { error: string }>> {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleJs =
      session.user.role === UserRole.JOBSEEKER ||
      String(session.user.role ?? "").toUpperCase() === UserRole.JOBSEEKER;
    if (!roleJs) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolved = await resolveJobSeekerDbUserForUpload(request, session);
    if (!resolved) {
      return NextResponse.json(
        { error: "SESSION_STALE_SIGN_IN_AGAIN" },
        { status: 401 },
      );
    }

    const prisma = getPrisma();
    const userId = resolved.id;

    const [
      profile,
      cv,
      user,
      applicationsCount,
      jobsAvailableCount,
      recentApps,
    ] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.cV.findUnique({ where: { userId } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { image: true, subscriptionTier: true },
      }),
      prisma.application.count({ where: { jobSeekerId: userId } }),
      prisma.job.count({ where: { isActive: true } }),
      prisma.application.findMany({
        where: { jobSeekerId: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          jobId: true,
          status: true,
          matchScore: true,
          createdAt: true,
          job: {
            select: {
              id: true,
              title: true,
              employer: { select: { name: true, email: true } },
            },
          },
        },
      }),
    ]);

    const jobMatchesCount = jobsAvailableCount;

    const recentApplications: JobSeekerDashboardPayload["recentApplications"] =
      recentApps.map((a) => ({
        id: a.id,
        jobId: a.jobId,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        jobTitle: a.job.title,
        company:
          a.job.employer?.name ??
          (a.job.employer?.email ? a.job.employer.email : null),
        matchScore: a.matchScore ?? null,
      }));

    const atsScore = cv?.atsScore ?? profile?.atsScore ?? null;

    const payload: JobSeekerDashboardPayload = {
      profileCompletion: cv
        ? computeCvCompletionPercent({ cv, hasProfilePhoto: Boolean(user?.image) })
        : computeProfileCompletionPercent(profile),
      applicationsCount,
      jobsAvailableCount,
      jobMatchesCount,
      /** Reserved until standalone assessment scoring is persisted. */
      assessmentScore: null,
      atsScore,
      subscriptionTier: user?.subscriptionTier ?? "FREE",
      recentApplications,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
