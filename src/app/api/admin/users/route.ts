import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { getPrisma } from "@/lib/db";
import { adminCacheHeaders, requireAdminApi } from "@/lib/admin/require-admin";
import { fetchAdminUsersList } from "@/lib/admin/stats-service";

const roleMap: Record<string, UserRole> = {
  "job-seeker": UserRole.JOBSEEKER,
  jobseeker: UserRole.JOBSEEKER,
  employer: UserRole.EMPLOYER,
  mentor: UserRole.MENTOR,
  admin: UserRole.ADMIN,
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  const sp = request.nextUrl.searchParams;
  const roleKey = sp.get("role") ?? "job-seeker";
  const role = roleMap[roleKey] ?? UserRole.JOBSEEKER;
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, Number(sp.get("pageSize") ?? "20")));

  const data = await fetchAdminUsersList({
    role,
    page,
    pageSize,
    search: sp.get("search") ?? undefined,
    plan: sp.get("plan") ?? undefined,
    assessmentStatus: sp.get("assessmentStatus") ?? undefined,
    joinedAfter: sp.get("joinedAfter") ?? undefined,
  });

  return NextResponse.json(
    { success: true, data },
    { headers: adminCacheHeaders() },
  );
}

const updateSchema = z.object({
  userId: z.string().min(1),
  subscriptionTier: z.enum(["FREE", "PROFESSIONAL", "PREMIUM"]).optional(),
  suspended: z.boolean().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      role: true,
      subscriptionTier: true,
      proctoringSuspendedUntil: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const suspendUntil = parsed.data.suspended
    ? new Date("2099-12-31")
    : parsed.data.suspended === false
      ? null
      : undefined;

  const updated = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      ...(parsed.data.subscriptionTier
        ? { subscriptionTier: parsed.data.subscriptionTier }
        : {}),
      ...(suspendUntil !== undefined
        ? { proctoringSuspendedUntil: suspendUntil }
        : {}),
    },
    select: { id: true, subscriptionTier: true, proctoringSuspendedUntil: true },
  });

  await logAudit({
    userId: session.user.id,
    action: "ADMIN_USER_UPDATE",
    entity: "User",
    entityId: updated.id,
    oldData: existing,
    newData: updated,
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });
  if (!existing || existing.role === UserRole.ADMIN) {
    return NextResponse.json({ error: "Cannot delete" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id: userId } });

  await logAudit({
    userId: session.user.id,
    action: "ADMIN_USER_DELETE",
    entity: "User",
    entityId: userId,
    oldData: existing,
  });

  return NextResponse.json({ success: true });
}
