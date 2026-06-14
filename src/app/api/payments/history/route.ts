import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { resolveDbUserIdForSession } from "@/lib/resolve-session-user";
import { listPaymentHistory } from "@/lib/payments/fulfill";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolved = await resolveDbUserIdForSession(session, request);
  if (!resolved) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const rows = await listPaymentHistory(resolved.id);
  return NextResponse.json({ success: true, data: { payments: rows } });
}
