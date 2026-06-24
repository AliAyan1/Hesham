import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clearCache } from "@/lib/cms";
import { getPrisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin/require-admin";

const updateSchema = z.object({
  key: z.string().trim().min(1),
  valueEn: z.string(),
  valueAr: z.string(),
});

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ key: string }> },
): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { key } = await context.params;
    const json: unknown = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success || parsed.data.key !== key) {
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });
    }

    const prisma = getPrisma();
    const item = await prisma.siteContent.update({
      where: { key },
      data: {
        valueEn: parsed.data.valueEn,
        valueAr: parsed.data.valueAr,
        updatedBy: authResult.session.user.email ?? authResult.session.user.id,
      },
    });

    clearCache();

    return NextResponse.json({
      ok: true,
      item: {
        id: item.id,
        key: item.key,
        valueEn: item.valueEn,
        valueAr: item.valueAr,
        section: item.section,
        label: item.label,
        type: item.type,
        updatedAt: item.updatedAt.toISOString(),
        updatedBy: item.updatedBy,
      },
    });
  } catch (error) {
    console.error("[admin/cms/:key] update failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
