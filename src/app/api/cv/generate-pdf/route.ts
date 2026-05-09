import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { SubscriptionTier } from "@/types";
import { hasAccess } from "@/lib/subscription";
import { CvPdfDocument } from "@/lib/cv/pdf/templates";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";

export const runtime = "nodejs";

const bodySchema = z.object({
  template: z.enum(["professional", "modern", "creative"]).default("professional"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const [user, cv] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true },
    }),
    prisma.cV.findUnique({ where: { userId: session.user.id } }),
  ]);

  if (!cv) {
    return NextResponse.json({ success: false, error: "CV not found" }, { status: 404 });
  }

  const tier = (user?.subscriptionTier ?? "FREE") as SubscriptionTier;
  const wantsLockedTemplate = parsed.data.template !== "professional";
  if (wantsLockedTemplate && !hasAccess(tier, "cv_templates_all")) {
    return NextResponse.json({ success: false, error: "Upgrade required" }, { status: 403 });
  }

  try {
    const element = React.createElement(CvPdfDocument, {
      cv,
      template: parsed.data.template,
    }) as unknown as React.ReactElement;
    const render = renderToBuffer as unknown as (el: React.ReactElement) => Promise<Buffer>;
    const buf = await render(element);
    const body = new Uint8Array(buf);

    const filename = `cv-${parsed.data.template}.pdf`;
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "PDF generation failed" }, { status: 502 });
  }
}

