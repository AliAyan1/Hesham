import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function POST(): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  await getPrisma().user.update({
    where: { id: session.user.id },
    data: { onboardingComplete: true },
    select: { id: true },
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}
