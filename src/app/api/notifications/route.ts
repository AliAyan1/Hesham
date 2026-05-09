import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { NotificationDto } from "@/types/dashboard";

export async function GET(): Promise<
  NextResponse<{ items: NotificationDto[] } | { error: string }>
> {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();
    const rows = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const items: NotificationDto[] = rows.map((n) => ({
      id: n.id,
      title: n.title,
      titleAr: n.titleAr,
      message: n.message,
      messageAr: n.messageAr,
      type: n.type,
      isRead: n.isRead,
      link: n.link,
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

type PatchBody =
  | { markAll?: true; ids?: undefined }
  | { markAll?: undefined; ids: string[] };

function isPatchBody(value: unknown): value is PatchBody {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.markAll === true && v.ids === undefined) return true;
  if (Array.isArray(v.ids) && v.ids.every((id) => typeof id === "string")) {
    return true;
  }
  return false;
}

export async function PATCH(request: Request): Promise<
  NextResponse<{ ok: boolean } | { error: string }>
> {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json: unknown = await request.json().catch(() => null);
    if (!isPatchBody(json)) {
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });
    }

    const prisma = getPrisma();
    const userId = session.user.id;

    if ("markAll" in json && json.markAll === true) {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if ("ids" in json && json.ids?.length) {
      await prisma.notification.updateMany({
        where: {
          userId,
          id: { in: json.ids },
        },
        data: { isRead: true },
      });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
