import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import type { TalentPoolInviteDto } from "@/lib/talent-pool/talent-pool-types";
import { expireStaleInvites } from "@/lib/talent-pool/talent-pool-invites";

export async function GET(
  _request: NextRequest,
): Promise<NextResponse<ApiResponse<{ items: TalentPoolInviteDto[] }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  await expireStaleInvites();
  const prisma = getPrisma();

  const invites = await prisma.talentPoolInvite.findMany({
    where: {
      candidateId: session.user.id,
      status: { notIn: ["DECLINED", "EXPIRED"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      job: { select: { title: true } },
      employer: {
        select: {
          name: true,
          employerProfile: { select: { companyName: true } },
        },
      },
    },
  });

  const items: TalentPoolInviteDto[] = invites.map((inv) => ({
    id: inv.id,
    jobId: inv.jobId,
    jobTitle: inv.job.title,
    companyName:
      inv.employer.employerProfile?.companyName?.trim() ||
      inv.employer.name?.trim() ||
      "Employer",
    status: inv.status,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  }));

  return NextResponse.json({ success: true, data: { items } });
}
