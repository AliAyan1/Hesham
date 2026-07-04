import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAllContentItems, clearCache } from "@/lib/cms";
import { ensureSiteContentSeeded } from "@/lib/cms-seed";
import { getPrisma } from "@/lib/db";
import { adminCacheHeaders, requireAdminApi } from "@/lib/admin/require-admin";

const updateSchema = z.object({
  key: z.string().trim().min(1),
  valueEn: z.string(),
  valueAr: z.string(),
});

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const updatedBy = authResult.session.user.email ?? authResult.session.user.id;
    await ensureSiteContentSeeded(updatedBy);
    const items = await getAllContentItems();
    return NextResponse.json({ ok: true, items }, { headers: adminCacheHeaders() });
  } catch (error) {
    console.error("[admin/cms] fetch failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const json: unknown = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });
    }

    const prisma = getPrisma();
    const item = await prisma.siteContent.update({
      where: { key: parsed.data.key },
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
    console.error("[admin/cms] update failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
