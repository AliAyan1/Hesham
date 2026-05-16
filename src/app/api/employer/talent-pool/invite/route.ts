import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import type { ApiResponse } from "@/types";
import { createTalentPoolInvite } from "@/lib/talent-pool/talent-pool-invites";

const bodySchema = z.object({
  candidateId: z.string().min(1),
  jobId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ inviteId: string; status: string }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  try {
    const result = await createTalentPoolInvite({
      employerId: session.user.id,
      candidateId: parsed.data.candidateId,
      jobId: parsed.data.jobId,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "invite_failed";
    const status =
      msg === "candidate_not_in_pool" ? 400 : msg === "job_not_found" ? 404 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
