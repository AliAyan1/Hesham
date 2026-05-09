import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse, EmployerCandidatePayload } from "@/types";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ applicationId: string }> },
): Promise<NextResponse<ApiResponse<EmployerCandidatePayload> | { success: false; error: string }>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await ctx.params;
  const prisma = getPrisma();

  const row = await prisma.application.findFirst({
    where: {
      id: applicationId,
      job: { employerId: session.user.id },
    },
    select: {
      id: true,
      job: { select: { title: true } },
      jobSeeker: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          profile: {
            select: {
              bio: true,
              phone: true,
              location: true,
              nationality: true,
            },
          },
          cv: {
            select: {
              fullName: true,
              professionalTitle: true,
              summary: true,
              experience: true,
              education: true,
              skills: true,
              languages: true,
              certifications: true,
              portfolioUrl: true,
              linkedinUrl: true,
            },
          },
        },
      },
    },
  });

  if (!row) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const payload: EmployerCandidatePayload = {
    applicationId: row.id,
    appliedForJobTitle: row.job.title,
    candidate: row.jobSeeker,
  };

  return NextResponse.json({ success: true, data: payload }, { status: 200 });
}
