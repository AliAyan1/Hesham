import { OfferStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { onOfferCreated } from "@/lib/email-triggers";

const bodySchema = z.object({
  applicationId: z.string(),
  fileUrl: z.string().url(),
  fileName: z.string().min(1),
  recruitmentFee: z.number().positive().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const app = await prisma.application.findFirst({
    where: {
      id: parsed.data.applicationId,
      job: { employerId: session.user.id },
    },
    include: {
      job: { select: { id: true, title: true, employerId: true } },
      jobSeeker: { select: { id: true, email: true, name: true } },
    },
  });
  if (!app) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const fee = parsed.data.recruitmentFee ?? 5000;
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const obligation = await prisma.obligationLetter.create({
    data: {
      employerId: session.user.id,
      candidateId: app.jobSeekerId,
      jobId: app.job.id,
      recruitmentFee: fee,
      terms: "Standard QudrahTech recruitment obligation terms apply.",
      expiresAt,
    },
  });

  const offer = await prisma.offerLetter.create({
    data: {
      employerId: session.user.id,
      candidateId: app.jobSeekerId,
      jobId: app.job.id,
      obligationId: obligation.id,
      fileUrl: parsed.data.fileUrl,
      fileName: parsed.data.fileName,
      expiresAt,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "offer.sent",
    entity: "OfferLetter",
    entityId: offer.id,
  });

  const employer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, employerProfile: { select: { companyName: true } } },
  });
  const company = employer?.employerProfile?.companyName ?? "Employer";

  if (app.jobSeeker.email && employer?.email) {
    await onOfferCreated({
      offerId: offer.id,
      candidateId: app.jobSeekerId,
      candidateEmail: app.jobSeeker.email,
      employerId: session.user.id,
      employerEmail: employer.email,
      company,
      jobTitle: app.job.title,
      obligationId: obligation.id,
      candidateName: app.jobSeeker.name ?? "Candidate",
      fee,
      currency: "SAR",
    });
  }

  return NextResponse.json(
    { success: true, data: { offerId: offer.id, obligationId: obligation.id } },
    { status: 201 },
  );
}
