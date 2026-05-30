import { ApplicationStatus, OfferStatus, UserRole } from "@prisma/client";
import { getPrisma } from "@/lib/db";

export async function canMessageEmployerAndSeeker(
  employerId: string,
  jobSeekerId: string,
): Promise<boolean> {
  const prisma = getPrisma();
  const shortlisted = await prisma.application.findFirst({
    where: {
      job: { employerId },
      jobSeekerId,
      status: ApplicationStatus.SHORTLISTED,
    },
    select: { id: true },
  });
  return Boolean(shortlisted);
}

export async function isHiredWithAcceptedOffer(
  employerId: string,
  candidateId: string,
): Promise<boolean> {
  const prisma = getPrisma();
  const hired = await prisma.application.findFirst({
    where: {
      job: { employerId },
      jobSeekerId: candidateId,
      status: ApplicationStatus.HIRED,
    },
    select: { id: true },
  });
  if (!hired) return false;

  const offer = await prisma.offerLetter.findFirst({
    where: {
      employerId,
      candidateId,
      status: OfferStatus.ACCEPTED,
    },
    select: { id: true },
  });
  return Boolean(offer);
}

export async function canMessageMentorSession(
  sessionId: string,
  userId: string,
): Promise<boolean> {
  const prisma = getPrisma();
  const row = await prisma.mentorSession.findFirst({
    where: {
      id: sessionId,
      OR: [
        { menteeId: userId },
        { mentor: { userId } },
      ],
      status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
    },
    select: { id: true },
  });
  return Boolean(row);
}

export function messagingRoleAllowed(role: string): boolean {
  return (
    role === UserRole.EMPLOYER ||
    role === UserRole.JOBSEEKER ||
    role === UserRole.MENTOR
  );
}
