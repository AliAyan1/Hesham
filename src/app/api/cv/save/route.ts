import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { Prisma } from "@prisma/client";
import { computeCvCompletionPercent } from "@/lib/cv/completion";

const schema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  fullNameAr: z.string().max(200).optional(),
  professionalTitle: z.string().max(200).optional(),
  professionalTitleAr: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  location: z.string().max(120).optional(),
  locationAr: z.string().max(120).optional(),
  linkedinUrl: z.string().url().optional(),
  portfolioUrl: z.string().url().optional(),
  summary: z.string().max(4000).optional(),
  summaryAr: z.string().max(4000).optional(),
  experience: z.unknown().optional(),
  education: z.unknown().optional(),
  skills: z.unknown().optional(),
  languages: z.unknown().optional(),
  certifications: z.unknown().optional(),
  template: z.string().max(40).optional(),
});

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const userId = session.user.id;
  const data = parsed.data;

  const jsonFields = {
    experience: data.experience ? toInputJson(data.experience) : undefined,
    education: data.education ? toInputJson(data.education) : undefined,
    skills: data.skills ? toInputJson(data.skills) : undefined,
    languages: data.languages ? toInputJson(data.languages) : undefined,
    certifications: data.certifications ? toInputJson(data.certifications) : undefined,
  };

  const scalarFields = {
    fullName: data.fullName,
    fullNameAr: data.fullNameAr,
    professionalTitle: data.professionalTitle,
    professionalTitleAr: data.professionalTitleAr,
    email: data.email,
    phone: data.phone,
    location: data.location,
    locationAr: data.locationAr,
    linkedinUrl: data.linkedinUrl,
    portfolioUrl: data.portfolioUrl,
    summary: data.summary,
    summaryAr: data.summaryAr,
    template: data.template,
  };

  await prisma.cV.upsert({
    where: { userId },
    create: {
      userId,
      ...scalarFields,
      ...jsonFields,
      completionPct: 0,
      isComplete: false,
    },
    update: {
      ...scalarFields,
      ...jsonFields,
    },
    select: { id: true },
  });

  const [cv, user] = await Promise.all([
    prisma.cV.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { image: true } }),
  ]);
  const completionPct = computeCvCompletionPercent({
    cv,
    hasProfilePhoto: Boolean(user?.image),
  });
  await prisma.cV.update({
    where: { userId },
    data: { completionPct, isComplete: completionPct >= 100 },
    select: { id: true },
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}

