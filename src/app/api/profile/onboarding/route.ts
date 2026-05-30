import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { resolveDbUserIdForSession } from "@/lib/resolve-session-user";
import type { ApiResponse } from "@/types";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ onboardingComplete: boolean }>>> {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolved = await resolveDbUserIdForSession(session, request);
  if (!resolved) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const row = await getPrisma().user.findUnique({
    where: { id: resolved.id },
    select: { onboardingComplete: true },
  });

  return NextResponse.json({
    success: true,
    data: { onboardingComplete: Boolean(row?.onboardingComplete) },
  });
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolved = await resolveDbUserIdForSession(session, request);
  if (!resolved) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  await getPrisma().user.update({
    where: { id: resolved.id },
    data: { onboardingComplete: true },
    select: { id: true },
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}
