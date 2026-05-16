import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { interviewTemplateSchema, type JobInterviewTemplate } from "@/lib/employer-interview/template";
import { getInterviewTemplateForJob, upsertInterviewTemplateForJob } from "@/lib/employer-interview/job-template-db";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
): Promise<NextResponse<ApiResponse<{ template: JobInterviewTemplate; jobTitle: string }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await ctx.params;
  const prisma = getPrisma();
  const job = await prisma.job.findFirst({
    where: { id: jobId, employerId: session.user.id },
    select: { id: true, title: true },
  });
  if (!job) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const template = await getInterviewTemplateForJob(jobId);

  return NextResponse.json({ success: true, data: { template, jobTitle: job.title } }, { status: 200 });
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await ctx.params;
  const raw: unknown = await request.json().catch(() => null);
  const body = raw && typeof raw === "object" && "template" in raw ? (raw as { template: unknown }).template : raw;
  const parsed = interviewTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const job = await prisma.job.findFirst({
    where: { id: jobId, employerId: session.user.id },
    select: { id: true },
  });
  if (!job) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  await upsertInterviewTemplateForJob(jobId, parsed.data);

  return NextResponse.json({ success: true, data: { ok: true } });
}
