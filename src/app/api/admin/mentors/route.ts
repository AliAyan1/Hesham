import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin/require-admin";

export async function GET(): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

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
