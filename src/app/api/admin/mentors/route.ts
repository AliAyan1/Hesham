import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const rows = await prisma.mentor.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
      _count: { select: { sessions: true } },
    },
  });

  const pending = rows.filter((m) => !m.isApproved && !m.rejectedReason);
  const approved = rows.filter((m) => m.isApproved);
  const rejected = rows.filter((m) => Boolean(m.rejectedReason) && !m.isApproved);

  return NextResponse.json({
    success: true,
    data: { pending, approved, rejected },
  });
}
