import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { CvPdfDocument } from "@/lib/cv/pdf/templates";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ applicationId: string }> },
): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.EMPLOYER) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await ctx.params;
  const prisma = getPrisma();

  const app = await prisma.application.findFirst({
    where: {
      id: applicationId,
      job: { employerId: session.user.id },
    },
    select: { jobSeekerId: true },
  });
  if (!app) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const cv = await prisma.cV.findUnique({ where: { userId: app.jobSeekerId } });
  if (!cv) {
    return NextResponse.json({ success: false, error: "CV not found" }, { status: 404 });
  }

  try {
    const element = React.createElement(CvPdfDocument, {
      cv,
      template: "professional",
    }) as unknown as React.ReactElement;
    const render = renderToBuffer as unknown as (el: React.ReactElement) => Promise<Buffer>;
    const buf = await render(element);
    const body = new Uint8Array(buf);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="candidate-cv.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "PDF generation failed" }, { status: 502 });
  }
}
