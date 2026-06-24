import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { clearSettingsCache } from "@/lib/settings";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/settings-defaults";
import { requireAdminApi } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const prisma = getPrisma();
    const existing = await prisma.platformSettings.findFirst();
    if (existing) {
      return NextResponse.json({
        ok: true,
        message: "Settings already initialized",
        id: existing.id,
      });
    }

    const created = await prisma.platformSettings.create({
      data: DEFAULT_PLATFORM_SETTINGS,
    });

    clearSettingsCache();

    return NextResponse.json({
      ok: true,
      message: "Default platform settings created",
      id: created.id,
    });
  } catch (error) {
    console.error("[admin/settings/seed] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
