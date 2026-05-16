import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

export async function GET(
  _request: NextRequest,
): Promise<
  NextResponse<
    ApiResponse<{
      items: Array<{
        id: string;
        userId: string;
        name: string | null;
        email: string;
        reason: string;
        trainingTags: unknown;
        createdAt: string;
      }>;
    }>
  >
> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const rows = await prisma.talentPoolEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        items: rows.map((r) => ({
          id: r.id,
          userId: r.userId,
          name: r.user.name,
          email: r.user.email,
          reason: r.reason,
          trainingTags: r.trainingTags,
          createdAt: r.createdAt.toISOString(),
        })),
      },
    },
    { status: 200 },
  );
}
