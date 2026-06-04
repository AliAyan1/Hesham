import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { getServerSession } from "@/lib/get-server-session";
import { dashboardPathForRole } from "@/lib/subscription";

export type AdminSession = Session & {
  user: NonNullable<Session["user"]> & { id: string; role: string };
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await getServerSession();
  if (!session?.user?.id) return null;
  if (session.user.role !== UserRole.ADMIN) return null;
  return session as AdminSession;
}

export async function requireAdminApi(): Promise<
  { session: AdminSession } | NextResponse<{ error: string }>
> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { session: session as AdminSession };
}

export async function ensureAdminPage(locale: string): Promise<AdminSession> {
  const session = await auth();
  if (!session?.user) {
    const { redirect } = await import("next/navigation");
    redirect(`/${locale}/auth/login`);
  }
  const authed = session as NonNullable<typeof session>;
  if (authed.user.role !== UserRole.ADMIN) {
    const { redirect } = await import("next/navigation");
    const role = String(authed.user.role ?? "JOBSEEKER");
    redirect(`/${locale}${dashboardPathForRole(role)}`);
  }
  return authed as AdminSession;
}

export function adminCacheHeaders(): HeadersInit {
  return { "Cache-Control": "private, max-age=30" };
}
