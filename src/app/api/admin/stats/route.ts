import { NextResponse } from "next/server";
import { adminCacheHeaders, requireAdminApi } from "@/lib/admin/require-admin";
import { fetchAdminStatsPayload } from "@/lib/admin/stats-service";
import type { AdminStatsPayload } from "@/types/admin";

export async function GET(): Promise<
  NextResponse<{ success: boolean; data: AdminStatsPayload } | { error: string }>
> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  const data = await fetchAdminStatsPayload();
  return NextResponse.json(
    { success: true, data },
    { status: 200, headers: adminCacheHeaders() },
  );
}
