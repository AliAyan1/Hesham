import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { apiError, runApiRoute } from "@/lib/api/route-handler";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  return runApiRoute("notifications/delete", async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const prisma = getPrisma();
    const result = await prisma.notification.deleteMany({
      where: { id, userId: session.user.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { deleted: true } }, { status: 200 });
  });
}
