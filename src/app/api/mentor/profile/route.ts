import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db";
import { requireMentorUser } from "@/lib/mentor/require-mentor";

const availabilityRow = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  isActive: z.boolean().optional(),
});

const putSchema = z.object({
  title: z.string().max(200).optional(),
  titleAr: z.string().max(200).optional(),
  bio: z.string().max(5000).optional(),
  bioAr: z.string().max(5000).optional(),
  expertise: z.array(z.string().max(80)).max(10).optional(),
  industries: z.array(z.string().max(80)).max(15).optional(),
  languages: z
    .array(z.object({ name: z.string(), level: z.string() }))
    .max(10)
    .optional(),
  hourlyRate: z.number().positive().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  yearsExperience: z.number().int().min(0).max(60).optional(),
  availability: z.array(availabilityRow).max(7).optional(),
});

export async function GET(): Promise<NextResponse> {
  const auth = await requireMentorUser();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const prisma = getPrisma();
  const row = await prisma.mentor.findUnique({
    where: { id: auth.ctx.mentorId },
    include: {
      user: { select: { name: true, email: true, image: true } },
      availability: { orderBy: { dayOfWeek: "asc" } },
      certifications: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!row) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { mentor: row } });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const auth = await requireMentorUser();
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const b = parsed.data;
  const prisma = getPrisma();

  try {
    await prisma.mentor.update({
      where: { id: auth.ctx.mentorId },
      data: {
        ...(b.title !== undefined ? { title: b.title } : {}),
        ...(b.titleAr !== undefined ? { titleAr: b.titleAr } : {}),
        ...(b.bio !== undefined ? { bio: b.bio } : {}),
        ...(b.bioAr !== undefined ? { bioAr: b.bioAr } : {}),
        ...(b.expertise !== undefined ? { expertise: b.expertise as Prisma.InputJsonValue } : {}),
        ...(b.industries !== undefined ? { industries: b.industries as Prisma.InputJsonValue } : {}),
        ...(b.languages !== undefined ? { languages: b.languages as Prisma.InputJsonValue } : {}),
        ...(b.hourlyRate !== undefined ? { hourlyRate: b.hourlyRate } : {}),
        ...(b.linkedinUrl !== undefined ? { linkedinUrl: b.linkedinUrl || null } : {}),
        ...(b.yearsExperience !== undefined ? { yearsExperience: b.yearsExperience } : {}),
      },
    });

    if (b.availability) {
      await prisma.mentorAvailability.deleteMany({ where: { mentorId: auth.ctx.mentorId } });
      if (b.availability.length > 0) {
        await prisma.mentorAvailability.createMany({
          data: b.availability.map((a) => ({
            mentorId: auth.ctx.mentorId,
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
            isActive: a.isActive ?? true,
          })),
        });
      }
    }

    const updated = await prisma.mentor.findUnique({
      where: { id: auth.ctx.mentorId },
      include: {
        availability: true,
        certifications: { orderBy: { createdAt: "desc" } },
        user: { select: { name: true, email: true, image: true } },
      },
    });

    return NextResponse.json({ success: true, data: { mentor: updated } });
  } catch {
    return NextResponse.json({ success: false, error: "Save failed" }, { status: 500 });
  }
}
