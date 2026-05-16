import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { expireStaleInvites } from "@/lib/talent-pool/talent-pool-invites";

export type EmployerTalentPoolInviteRow = {
  id: string;
  candidateId: string;
  candidateName: string | null;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ items: EmployerTalentPoolInviteRow[] }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const jobId = request.nextUrl.searchParams.get("jobId");
  const candidateId = request.nextUrl.searchParams.get("candidateId");

  await expireStaleInvites();
  const prisma = getPrisma();

  const invites = await prisma.talentPoolInvite.findMany({
    where: {
      employerId: session.user.id,
      ...(jobId ? { jobId } : {}),
      ...(candidateId ? { candidateId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      candidate: { select: { name: true, email: true } },
      job: { select: { title: true } },
    },
  });

  const items: EmployerTalentPoolInviteRow[] = invites.map((inv) => ({
    id: inv.id,
    candidateId: inv.candidateId,
    candidateName: inv.candidate.name,
    candidateEmail: inv.candidate.email,
    jobId: inv.jobId,
    jobTitle: inv.job.title,
    status: inv.status,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  }));

  return NextResponse.json({ success: true, data: { items } });
}
