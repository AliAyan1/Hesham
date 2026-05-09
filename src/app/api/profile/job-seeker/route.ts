import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { refreshJobSeekerCvCompletionPct } from "@/lib/cv/refresh-jobseeker-completion";

const jobPrefsSchema = z
  .object({
    desiredJobTitle: z.string().max(200).optional(),
    preferredCategories: z.array(z.string().max(60)).max(20).optional(),
    preferredLocation: z.string().max(200).optional(),
    salaryMin: z.number().int().min(0).optional(),
    salaryMax: z.number().int().min(0).optional(),
    preferredJobTypes: z.array(z.string().max(40)).max(10).optional(),
    availableFrom: z.string().max(40).optional(),
  })
  .optional();

const profilePatchSchema = z.object({
  bio: z.string().max(5000).optional(),
  phone: z.string().max(50).optional(),
  location: z.string().max(200).optional(),
  language: z.enum(["ar", "en", "fr", "es", "ur", "tr"]).optional(),
  dateOfBirth: z.string().max(32).nullable().optional(),
  gender: z.string().max(40).nullable().optional(),
  nationality: z.string().max(120).nullable().optional(),
  jobPreferences: jobPrefsSchema,
});

const cvPatchSchema = z.object({
  fullName: z.string().max(200).optional(),
  fullNameAr: z.string().max(200).optional(),
  professionalTitle: z.string().max(200).optional(),
  professionalTitleAr: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  location: z.string().max(120).optional(),
  locationAr: z.string().max(120).optional(),
  linkedinUrl: z.string().max(512).optional(),
  portfolioUrl: z.string().max(512).optional(),
  summary: z.string().max(4000).optional(),
  summaryAr: z.string().max(4000).optional(),
  experience: z.unknown().optional(),
  education: z.unknown().optional(),
  skills: z.unknown().optional(),
  languages: z.unknown().optional(),
  certifications: z.unknown().optional(),
});

const putSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  profile: profilePatchSchema.optional(),
  cv: cvPatchSchema.optional(),
});

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function parseDob(raw: string | null | undefined): Date | undefined {
  if (!raw || raw === "") return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(): Promise<NextResponse<ApiResponse<Record<string, unknown>>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const userId = session.user.id;

  const [user, profile, cv] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, image: true, subscriptionTier: true },
    }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.cV.findUnique({ where: { userId } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      user: user ?? {},
      profile: profile ?? {},
      cv: cv ?? {},
    },
  });
}

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const userId = session.user.id;

  await prisma.$transaction(async (tx) => {
    if (parsed.data.name?.trim()) {
      await tx.user.update({
        where: { id: userId },
        data: { name: parsed.data.name.trim() },
        select: { id: true },
      });
    }

    if (parsed.data.profile) {
      const pp = parsed.data.profile;
      await tx.profile.upsert({
        where: { userId },
        create: {
          userId,
          bio: pp.bio,
          phone: pp.phone ?? null,
          location: pp.location ?? null,
          language: pp.language ?? "ar",
          dateOfBirth: parseDob(pp.dateOfBirth ?? undefined),
          gender: pp.gender ?? undefined,
          nationality: pp.nationality ?? undefined,
          ...(pp.jobPreferences !== undefined
            ? {
                jobPreferences:
                  pp.jobPreferences === null
                    ? Prisma.DbNull
                    : (toInputJson(pp.jobPreferences) as Prisma.InputJsonValue),
              }
            : {}),
        },
        update: {
          ...(pp.bio !== undefined ? { bio: pp.bio } : {}),
          ...(pp.phone !== undefined ? { phone: pp.phone || null } : {}),
          ...(pp.location !== undefined ? { location: pp.location || null } : {}),
          ...(pp.language !== undefined ? { language: pp.language } : {}),
          ...(pp.dateOfBirth !== undefined
            ? { dateOfBirth: parseDob(pp.dateOfBirth ?? undefined) ?? null }
            : {}),
          ...(pp.gender !== undefined ? { gender: pp.gender ?? null } : {}),
          ...(pp.nationality !== undefined ? { nationality: pp.nationality ?? null } : {}),
          ...(pp.jobPreferences !== undefined
            ? {
                jobPreferences:
                  pp.jobPreferences === null
                    ? Prisma.DbNull
                    : (toInputJson(pp.jobPreferences) as Prisma.InputJsonValue),
              }
            : {}),
        },
        select: { id: true },
      });
    }

    if (parsed.data.cv) {
      const c = parsed.data.cv;
      const jsonParts: Record<string, Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined> =
        {};
      if (c.experience !== undefined) jsonParts.experience = toInputJson(c.experience);
      if (c.education !== undefined) jsonParts.education = toInputJson(c.education);
      if (c.skills !== undefined) jsonParts.skills = toInputJson(c.skills);
      if (c.languages !== undefined) jsonParts.languages = toInputJson(c.languages);
      if (c.certifications !== undefined) jsonParts.certifications = toInputJson(c.certifications);

      await tx.cV.upsert({
        where: { userId },
        create: {
          userId,
          fullName: c.fullName,
          fullNameAr: c.fullNameAr,
          professionalTitle: c.professionalTitle,
          professionalTitleAr: c.professionalTitleAr,
          phone: c.phone,
          location: c.location,
          locationAr: c.locationAr,
          linkedinUrl: c.linkedinUrl,
          portfolioUrl: c.portfolioUrl,
          summary: c.summary,
          summaryAr: c.summaryAr,
          ...jsonParts,
        },
        update: {
          ...(c.fullName !== undefined ? { fullName: c.fullName } : {}),
          ...(c.fullNameAr !== undefined ? { fullNameAr: c.fullNameAr } : {}),
          ...(c.professionalTitle !== undefined ? { professionalTitle: c.professionalTitle } : {}),
          ...(c.professionalTitleAr !== undefined
            ? { professionalTitleAr: c.professionalTitleAr }
            : {}),
          ...(c.phone !== undefined ? { phone: c.phone } : {}),
          ...(c.location !== undefined ? { location: c.location } : {}),
          ...(c.locationAr !== undefined ? { locationAr: c.locationAr } : {}),
          ...(c.linkedinUrl !== undefined ? { linkedinUrl: c.linkedinUrl } : {}),
          ...(c.portfolioUrl !== undefined ? { portfolioUrl: c.portfolioUrl } : {}),
          ...(c.summary !== undefined ? { summary: c.summary } : {}),
          ...(c.summaryAr !== undefined ? { summaryAr: c.summaryAr } : {}),
          ...jsonParts,
        },
        select: { id: true },
      });
    }
  });

  await refreshJobSeekerCvCompletionPct(userId);

  return NextResponse.json({ success: true, data: { ok: true } });
}

export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  return PUT(request);
}
