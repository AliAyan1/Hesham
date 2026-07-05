import { NextResponse, type NextRequest } from "next/server";
import { UserRole, Prisma } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { createJobSchema, createJobValidationMessage } from "@/lib/jobs/create-job-schema";
import { runAutoShortlistForJob } from "@/lib/jobs/run-auto-shortlist";
import { notifyJobSeekersOnNewJob } from "@/lib/jobs/notify-job-matches";
import { getSettings } from "@/lib/settings";

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = createJobSchema.safeParse(raw);
  if (!parsed.success) {
    const error = createJobValidationMessage(parsed.error.issues, {
      titleMin: "Job title must be at least 3 characters.",
      locationRequired: "Work location is required for on-site jobs.",
      generic: "Validation failed",
    });
    return NextResponse.json({ success: false, error }, { status: 400 });
  }

  const b = parsed.data;
  const prisma = getPrisma();
  const settings = await getSettings();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const jobsThisMonth = await prisma.job.count({
    where: {
      employerId: session.user.id,
      createdAt: { gte: monthStart },
    },
  });
  if (jobsThisMonth >= settings.maxJobsPerEmployer) {
    return NextResponse.json(
      { success: false, error: "Monthly job posting limit reached" },
      { status: 403 },
    );
  }

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

  void runAutoShortlistForJob(job.id, session.user.id, { notify: false }).then(() =>
    notifyJobSeekersOnNewJob(job.id),
  );

  return NextResponse.json({ success: true, data: { id: job.id } }, { status: 201 });
}
