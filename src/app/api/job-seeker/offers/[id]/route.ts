import { OfferStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const respondSchema = z.object({
  accept: z.boolean(),
  declineReason: z.string().max(2000).optional(),
});

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const prisma = getPrisma();
  const row = await prisma.offerLetter.findFirst({
    where: { id, candidateId: session.user.id },
    include: {
      job: { select: { title: true } },
      employer: { select: { employerProfile: { select: { companyName: true } } } },
    },
  });
  if (!row) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: row });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const parsed = respondSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const row = await prisma.offerLetter.findFirst({
    where: { id, candidateId: session.user.id, status: OfferStatus.PENDING },
  });
  if (!row) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  if (!parsed.data.accept && !parsed.data.declineReason?.trim()) {
    return NextResponse.json({ success: false, error: "Decline reason required" }, { status: 400 });
  }

  await prisma.offerLetter.update({
    where: { id },
    data: {
      status: parsed.data.accept ? OfferStatus.ACCEPTED : OfferStatus.DECLINED,
      candidateResponse: parsed.data.accept ? "ACCEPTED" : "DECLINED",
      declineReason: parsed.data.declineReason ?? null,
      respondedAt: new Date(),
    },
  });

  if (parsed.data.accept) {
    await prisma.application.updateMany({
      where: { jobId: row.jobId, jobSeekerId: session.user.id },
      data: { offerAcceptedAt: new Date() },
    });
  }

  await logAudit({
    userId: session.user.id,
    action: parsed.data.accept ? "offer.accepted" : "offer.declined",
    entity: "OfferLetter",
    entityId: id,
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}
