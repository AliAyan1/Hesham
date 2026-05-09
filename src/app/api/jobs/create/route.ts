import { NextResponse, type NextRequest } from "next/server";
import { UserRole, Prisma } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { jobCategorySchema, jobTypeSchema, hiringMetaSchema } from "@/lib/jobs/constants";

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

const createSchema = z.object({
  title: z.string().min(3).max(200),
  titleAr: z.string().max(200).optional(),
  description: z.string().min(20).max(12000),
  descriptionAr: z.string().max(12000).optional(),
  category: jobCategorySchema,
  type: jobTypeSchema,
  location: z.string().max(200).optional(),
  locationAr: z.string().max(200).optional(),
  isRemote: z.boolean().optional(),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  currency: z.string().max(8).optional(),
  requirements: z.array(z.string().max(800)).max(80).optional(),
  benefits: z.array(z.string().max(800)).max(80).optional(),
  skills: z.array(z.string().max(120)).max(60).optional(),
  hiringMeta: hiringMetaSchema,
  expiresAt: z.string().datetime().optional(),
  isFeatured: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const b = parsed.data;
  const prisma = getPrisma();

  const job = await prisma.job.create({
    data: {
      employerId: session.user.id,
      title: b.title,
      titleAr: b.titleAr,
      description: b.description,
      descriptionAr: b.descriptionAr,
      category: b.category,
      type: b.type,
      location: b.location,
      locationAr: b.locationAr,
      isRemote: b.isRemote ?? false,
      salaryMin: b.salaryMin,
      salaryMax: b.salaryMax,
      currency: b.currency ?? "SAR",
      requirements: b.requirements ? toInputJson(b.requirements) : undefined,
      benefits: b.benefits ? toInputJson(b.benefits) : undefined,
      skills: b.skills ? toInputJson(b.skills) : undefined,
      hiringMeta: b.hiringMeta ? toInputJson(b.hiringMeta) : undefined,
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : undefined,
      isFeatured: b.isFeatured ?? false,
    },
    select: { id: true },
  });

  return NextResponse.json({ success: true, data: { id: job.id } }, { status: 201 });
}
