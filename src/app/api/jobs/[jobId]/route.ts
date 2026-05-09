import { NextResponse, type NextRequest } from "next/server";
import { UserRole, Prisma } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { jobCategorySchema, jobTypeSchema, hiringMetaSchema } from "@/lib/jobs/constants";

const updateBodySchema = z.object({
  title: z.string().min(3).max(200).optional(),
  titleAr: z.string().max(200).optional(),
  description: z.string().min(20).max(12000).optional(),
  descriptionAr: z.string().max(12000).optional(),
  category: jobCategorySchema.optional(),
  type: jobTypeSchema.optional(),
  location: z.string().max(200).nullable().optional(),
  locationAr: z.string().max(200).nullable().optional(),
  isRemote: z.boolean().optional(),
  salaryMin: z.number().int().min(0).nullable().optional(),
  salaryMax: z.number().int().min(0).nullable().optional(),
  currency: z.string().max(8).optional(),
  requirements: z.array(z.string().max(800)).max(80).optional(),
  benefits: z.array(z.string().max(800)).max(80).optional(),
  skills: z.array(z.string().max(120)).max(60).optional(),
  hiringMeta: hiringMetaSchema,
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const { jobId } = await ctx.params;
  if (!jobId) {
    return NextResponse.json({ success: false, error: "Missing job id" }, { status: 400 });
  }

  const prisma = getPrisma();
  const job = await prisma.job.findFirst({
    where: { id: jobId, isActive: true },
    include: {
      employer: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          employerProfile: {
            select: {
              companyName: true,
              logoUrl: true,
              websiteUrl: true,
              description: true,
              industry: true,
            },
          },
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
  }

  void prisma.job
    .update({
      where: { id: job.id },
      data: { viewCount: { increment: 1 } },
      select: { id: true },
    })
    .catch(() => undefined);

  const companyName =
    job.employer.employerProfile?.companyName?.trim() ||
    job.employer.name?.trim() ||
    job.employer.email;

  return NextResponse.json({
    success: true,
    data: {
      ...job,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      expiresAt: job.expiresAt?.toISOString() ?? null,
      companyName,
    },
  });
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
  const prisma = getPrisma();
  const existing = await prisma.job.findFirst({
    where: { id: jobId, employerId: session.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = updateBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const b = parsed.data;
  await prisma.job.update({
    where: { id: jobId },
    data: {
      ...(b.title !== undefined ? { title: b.title } : {}),
      ...(b.titleAr !== undefined ? { titleAr: b.titleAr } : {}),
      ...(b.description !== undefined ? { description: b.description } : {}),
      ...(b.descriptionAr !== undefined ? { descriptionAr: b.descriptionAr } : {}),
      ...(b.category !== undefined ? { category: b.category } : {}),
      ...(b.type !== undefined ? { type: b.type } : {}),
      ...(b.location !== undefined ? { location: b.location } : {}),
      ...(b.locationAr !== undefined ? { locationAr: b.locationAr } : {}),
      ...(b.isRemote !== undefined ? { isRemote: b.isRemote } : {}),
      ...(b.salaryMin !== undefined ? { salaryMin: b.salaryMin } : {}),
      ...(b.salaryMax !== undefined ? { salaryMax: b.salaryMax } : {}),
      ...(b.currency !== undefined ? { currency: b.currency } : {}),
      ...(b.requirements !== undefined ? { requirements: toInputJson(b.requirements) } : {}),
      ...(b.benefits !== undefined ? { benefits: toInputJson(b.benefits) } : {}),
      ...(b.skills !== undefined ? { skills: toInputJson(b.skills) } : {}),
      ...(b.hiringMeta !== undefined ? { hiringMeta: toInputJson(b.hiringMeta ?? null) } : {}),
      ...(b.isActive !== undefined ? { isActive: b.isActive } : {}),
      ...(b.expiresAt !== undefined
        ? {
            expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
          }
        : {}),
    },
    select: { id: true },
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await ctx.params;
  const prisma = getPrisma();
  const existing = await prisma.job.findFirst({
    where: { id: jobId, employerId: session.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  await prisma.job.delete({ where: { id: jobId }, select: { id: true } });
  return NextResponse.json({ success: true, data: { ok: true } });
}
