import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { clearCache } from "@/lib/cms";
import { SITE_CONTENT_SEED } from "@/lib/cms-defaults";
import { requireAdminApi } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const prisma = getPrisma();

    const results = await Promise.all(
      SITE_CONTENT_SEED.map((item) =>
        prisma.siteContent.upsert({
          where: { key: item.key },
          update: {
            valueEn: item.valueEn,
            valueAr: item.valueAr,
            section: item.section,
            label: item.label,
            type: item.type ?? "text",
            updatedBy: authResult.session.user.email ?? authResult.session.user.id,
          },
          create: {
            key: item.key,
            valueEn: item.valueEn,
            valueAr: item.valueAr,
            section: item.section,
            label: item.label,
            type: item.type ?? "text",
            updatedBy: authResult.session.user.email ?? authResult.session.user.id,
          },
          select: { key: true },
        }),
      ),
    );

    clearCache();

    return NextResponse.json({
      ok: true,
      seeded: results.length,
      keys: results.map((result) => result.key),
    });
  } catch (error) {
    console.error("[admin/cms/seed] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
