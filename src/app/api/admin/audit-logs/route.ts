import { NextResponse, type NextRequest } from "next/server";
import { getPrisma } from "@/lib/db";
import { adminCacheHeaders, requireAdminApi } from "@/lib/admin/require-admin";
import type { AdminAuditRow } from "@/types/admin";

function auditStatus(action: string): AdminAuditRow["status"] {
  const a = action.toLowerCase();
  if (a.includes("fail") || a.includes("reject") || a.includes("delete")) {
    return "failed";
  }
  if (a.includes("flag") || a.includes("warn") || a.includes("suspend")) {
    return "warning";
  }
  return "success";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  const sp = request.nextUrl.searchParams;
  const action = sp.get("action");
  const search = sp.get("search");
  const from = sp.get("from");
  const to = sp.get("to");
  const take = Math.min(200, Math.max(1, Number(sp.get("limit") ?? "100")));

  const prisma = getPrisma();
  const where: {
    action?: { contains: string; mode: "insensitive" };
    createdAt?: { gte?: Date; lte?: Date };
    OR?: Array<{ user?: { email?: { contains: string; mode: "insensitive" } } }>;
  } = {};

  if (action) where.action = { contains: action, mode: "insensitive" };
  if (from || to) {
    where.createdAt = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) where.createdAt.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) where.createdAt.lte = d;
    }
  }
  if (search?.trim()) {
    where.OR = [
      { user: { email: { contains: search.trim(), mode: "insensitive" } } },
    ];
  }

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { name: true, email: true } } },
  });

  const items: AdminAuditRow[] = rows.map((r) => ({
    id: r.id,
    timestamp: r.createdAt.toISOString(),
    userName: r.user?.name ?? null,
    userEmail: r.user?.email ?? null,
    action: r.action,
    details: `${r.entity}${r.entityId ? ` #${r.entityId.slice(0, 8)}` : ""}`,
    ipAddress: r.ipAddress,
    status: auditStatus(r.action),
  }));

  return NextResponse.json(
    { success: true, data: { items } },
    { headers: adminCacheHeaders() },
  );
}
