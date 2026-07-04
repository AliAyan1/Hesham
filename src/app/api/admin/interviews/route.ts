import { NextResponse, type NextRequest } from "next/server";
import { adminCacheHeaders, requireAdminApi } from "@/lib/admin/require-admin";
import { fetchAdminInterviewsPayload } from "@/lib/admin/stats-service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const data = await fetchAdminInterviewsPayload(status || undefined);
  return NextResponse.json(
    { success: true, data },
    { headers: adminCacheHeaders() },
  );
}
