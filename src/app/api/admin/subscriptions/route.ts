import { NextResponse } from "next/server";
import { adminCacheHeaders, requireAdminApi } from "@/lib/admin/require-admin";
import { fetchAdminSubscriptionsPayload } from "@/lib/admin/stats-service";

export async function GET(): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  const data = await fetchAdminSubscriptionsPayload();
  return NextResponse.json(
    { success: true, data },
    { headers: adminCacheHeaders() },
  );
}
