import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { GET as getJobSeekerProfile, PUT as putJobSeekerProfile } from "@/app/api/profile/job-seeker/route";
import { GET as getEmployerProfile, PUT as putEmployerProfile } from "@/app/api/profile/employer/route";
import { getServerSession } from "@/lib/get-server-session";
import { runApiRoute } from "@/lib/api/route-handler";

export async function GET(): Promise<NextResponse> {
  return runApiRoute("profile", async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role === UserRole.JOBSEEKER) {
      return getJobSeekerProfile();
    }
    if (session.user.role === UserRole.EMPLOYER) {
      return getEmployerProfile();
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  return runApiRoute("profile", async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role === UserRole.JOBSEEKER) {
      return putJobSeekerProfile(request);
    }
    if (session.user.role === UserRole.EMPLOYER) {
      return putEmployerProfile(request);
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  });
}
