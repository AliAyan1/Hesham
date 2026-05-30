import { NextResponse, type NextRequest } from "next/server";
import { AssessmentStatus, UserRole } from "@prisma/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { parseTraitScores } from "@/lib/assessment/assessment-data";
import { AssessmentReportPdf } from "@/lib/assessment/pdf-report";
import type { TraitScoresMap, WrittenReport } from "@/lib/assessment/profilext-types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
  }

  const prisma = getPrisma();
  const row = await prisma.assessment.findFirst({
    where: { id },
    include: { user: { select: { id: true, name: true } } },
  });

  if (!row || row.status !== AssessmentStatus.COMPLETED) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const isOwner = row.userId === session.user.id;
  const isEmployerView = session.user.role === UserRole.EMPLOYER;
  if (!isOwner && !isEmployerView) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  if (!row.writtenReport || !row.traitScores) {
    return NextResponse.json({ success: false, error: "Report not ready" }, { status: 409 });
  }

  const traitScores = parseTraitScores(row.traitScores) as TraitScoresMap;
  const report = row.writtenReport as WrittenReport;

  const buffer = await renderToBuffer(
    AssessmentReportPdf({
      candidateName: row.user.name ?? "Candidate",
      completedAt: row.completedAt?.toISOString().slice(0, 10) ?? "",
      traitScores,
      report,
      thinkingStyleScore: Math.round(row.thinkingStyleScore ?? 0),
      behavioralScore: Math.round(row.behavioralScore ?? 0),
      interestsScore: Math.round(row.interestsScore ?? 0),
    }),
  );

  const filename = `qudrahtech-assessment-${id.slice(0, 8)}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
