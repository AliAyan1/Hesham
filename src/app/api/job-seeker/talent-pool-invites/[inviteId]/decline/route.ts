import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import type { ApiResponse } from "@/types";
import { declineTalentPoolInvite } from "@/lib/talent-pool/talent-pool-invites";

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ inviteId: string }> },
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { inviteId } = await ctx.params;
  await declineTalentPoolInvite({ inviteId, candidateId: session.user.id });
  return NextResponse.json({ success: true, data: { ok: true } });
}
