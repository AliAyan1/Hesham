import { NextResponse } from "next/server";
import { clearCache as clearCmsCache } from "@/lib/cms";
import { clearSettingsCache } from "@/lib/settings";
import { requireAdminApi } from "@/lib/admin/require-admin";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  clearSettingsCache();
  clearCmsCache();

  await logAudit({
    userId: authResult.session.user.id,
    action: "SETTINGS_CACHE_CLEAR",
    entity: "PlatformSettings",
    entityId: null,
  });

  return NextResponse.json({ ok: true });
}
