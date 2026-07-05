import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import type { ApiResponse } from "@/types";
import type { ShortlistPayload } from "@/lib/jobs/shortlist-types";
import {
  getJobShortlistPayload,
  runAutoShortlistForJob,
} from "@/lib/jobs/run-auto-shortlist";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
): Promise<NextResponse<ApiResponse<ShortlistPayload & { needsRefresh: boolean }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await ctx.params;
  const payload = await getJobShortlistPayload(jobId, session.user.id);
  if (!payload) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const needsRefresh =
    payload.applicantCount > 0 &&
    (payload.entries.length === 0 ||
      payload.entries.length !== payload.applicantCount ||
      !payload.generatedAt);

  return NextResponse.json(
    { success: true, data: { ...payload, needsRefresh } },
    { status: 200 },
  );
}

/** Run Claude AI shortlist for all applicants on this job. */
export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
): Promise<NextResponse<ApiResponse<ShortlistPayload>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await ctx.params;

  try {
    const payload = await runAutoShortlistForJob(jobId, session.user.id, { notify: false });
    if (!payload.jobTitle) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: payload }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "AI shortlist failed — try again." },
      { status: 500 },
    );
  }
}
