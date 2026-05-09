import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { UserRole, Prisma } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

const employerPutSchema = z.object({
  companyName: z.string().max(200).optional(),
  companyNameAr: z.string().max(200).optional(),
  logoUrl: z.string().max(512).optional(),
  industry: z.string().max(120).optional(),
  companySize: z.string().max(40).optional(),
  foundedYear: z.number().int().min(1800).max(2100).nullable().optional(),
  websiteUrl: z.string().max(512).optional(),
  linkedinUrl: z.string().max(512).optional(),
  description: z.string().max(8000).optional(),
  descriptionAr: z.string().max(8000).optional(),
  contactName: z.string().max(120).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().max(50).optional(),
  officeLocation: z.string().max(300).optional(),
  crNumber: z.string().max(80).optional(),
  twitterUrl: z.string().max(512).optional(),
  instagramUrl: z.string().max(512).optional(),
  hiringCategories: z.array(z.string().max(60)).max(30).optional(),
  preferredCandidateLocations: z.array(z.string().max(120)).max(30).optional(),
  activeHiring: z.boolean().optional(),
});

export async function GET(): Promise<NextResponse<ApiResponse<Record<string, unknown>>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const userId = session.user.id;

  const [user, ep] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, image: true },
    }),
    prisma.employerProfile.findUnique({ where: { userId } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      user: user ?? {},
      employerProfile:
        ep ??
        ({
          userId,
        } as Record<string, unknown>),
    },
  });
}

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = employerPutSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const userId = session.user.id;
  const b = parsed.data;

  await prisma.employerProfile.upsert({
    where: { userId },
    create: {
      userId,
      companyName: b.companyName,
      companyNameAr: b.companyNameAr,
      logoUrl: b.logoUrl,
      industry: b.industry,
      companySize: b.companySize,
      foundedYear: b.foundedYear ?? undefined,
      websiteUrl: b.websiteUrl,
      linkedinUrl: b.linkedinUrl,
      description: b.description,
      descriptionAr: b.descriptionAr,
      contactName: b.contactName,
      contactEmail: b.contactEmail || undefined,
      contactPhone: b.contactPhone,
      officeLocation: b.officeLocation,
      crNumber: b.crNumber,
      twitterUrl: b.twitterUrl,
      instagramUrl: b.instagramUrl,
      hiringCategories:
        b.hiringCategories !== undefined ? toInputJson(b.hiringCategories) : undefined,
      preferredCandidateLocations:
        b.preferredCandidateLocations !== undefined
          ? toInputJson(b.preferredCandidateLocations)
          : undefined,
      activeHiring: b.activeHiring ?? true,
    },
    update: {
      ...(b.companyName !== undefined ? { companyName: b.companyName } : {}),
      ...(b.companyNameAr !== undefined ? { companyNameAr: b.companyNameAr } : {}),
      ...(b.logoUrl !== undefined ? { logoUrl: b.logoUrl } : {}),
      ...(b.industry !== undefined ? { industry: b.industry } : {}),
      ...(b.companySize !== undefined ? { companySize: b.companySize } : {}),
      ...(b.foundedYear !== undefined ? { foundedYear: b.foundedYear } : {}),
      ...(b.websiteUrl !== undefined ? { websiteUrl: b.websiteUrl } : {}),
      ...(b.linkedinUrl !== undefined ? { linkedinUrl: b.linkedinUrl } : {}),
      ...(b.description !== undefined ? { description: b.description } : {}),
      ...(b.descriptionAr !== undefined ? { descriptionAr: b.descriptionAr } : {}),
      ...(b.contactName !== undefined ? { contactName: b.contactName } : {}),
      ...(b.contactEmail !== undefined ? { contactEmail: b.contactEmail || null } : {}),
      ...(b.contactPhone !== undefined ? { contactPhone: b.contactPhone } : {}),
      ...(b.officeLocation !== undefined ? { officeLocation: b.officeLocation } : {}),
      ...(b.crNumber !== undefined ? { crNumber: b.crNumber } : {}),
      ...(b.twitterUrl !== undefined ? { twitterUrl: b.twitterUrl } : {}),
      ...(b.instagramUrl !== undefined ? { instagramUrl: b.instagramUrl } : {}),
      ...(b.hiringCategories !== undefined ? { hiringCategories: toInputJson(b.hiringCategories) } : {}),
      ...(b.preferredCandidateLocations !== undefined
        ? { preferredCandidateLocations: toInputJson(b.preferredCandidateLocations) }
        : {}),
      ...(b.activeHiring !== undefined ? { activeHiring: b.activeHiring } : {}),
    },
    select: { id: true },
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}
