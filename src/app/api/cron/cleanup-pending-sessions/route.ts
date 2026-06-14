import { SessionStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);

  const deleted = await prisma.mentorSession.deleteMany({
    where: {
      status: SessionStatus.PENDING,
      createdAt: { lt: cutoff },
    },
  });

  return NextResponse.json({ success: true, data: { deleted: deleted.count } });
}
