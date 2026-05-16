import type { Session } from "next-auth";
import type { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getToken } from "next-auth/jwt";
import { getPrisma } from "@/lib/db";
import { getAuthSecret } from "@/lib/auth-secret";

/** Normalized emails from Session + optional JWT cookie (some JWTs omit `session.user.email`). */
async function emailsFromSessionAndCookie(
  session: Session | null,
  request?: NextRequest,
): Promise<string[]> {
  const emails = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === "string") {
      const t = v.trim().toLowerCase();
      if (t.includes("@")) emails.add(t);
    }
  };
  add(session?.user?.email);

  if (request) {
    const secret = getAuthSecret();
    if (secret) {
      try {
        const tok = await getToken({ req: request, secret });
        add(tok?.email);
      } catch {
        // ignore
      }
    }
  }

  return [...emails];
}

/**
 * Resolve Prisma User id for job seeker flows when JWT id is missing or stale (db reset, same-email re-register).
 */
export async function resolveJobSeekerDbUserForUpload(
  session: Session | null,
  request?: NextRequest,
): Promise<{ id: string; image: string | null } | null> {
  if (!session?.user) return null;
  const isJobSeeker =
    session.user.role === UserRole.JOBSEEKER ||
    String(session.user.role ?? "").toUpperCase() === UserRole.JOBSEEKER;
  if (!isJobSeeker) return null;

  const prisma = getPrisma();
  const sid = typeof session.user.id === "string" ? session.user.id.trim() : "";
  if (sid.length > 0) {
    const hit = await prisma.user.findUnique({
      where: { id: sid },
      select: { id: true, image: true, role: true },
    });
    if (hit?.role === UserRole.JOBSEEKER) {
      return { id: hit.id, image: hit.image };
    }
  }

  for (const em of await emailsFromSessionAndCookie(session, request)) {
    const row = await prisma.user.findFirst({
      where: {
        email: { equals: em, mode: "insensitive" },
        role: UserRole.JOBSEEKER,
      },
      select: { id: true, image: true },
    });
    if (row) return { id: row.id, image: row.image };
  }

  return null;
}

/**
 * Resolve Prisma User id for account-wide APIs (upgrade, billing) when JWT `id` is stale
 * after DB reset or re-register with the same email.
 */
export async function resolveDbUserIdForSession(
  session: Session | null,
  request?: NextRequest,
): Promise<{ id: string } | null> {
  if (!session?.user) return null;

  const prisma = getPrisma();
  const sid = typeof session.user.id === "string" ? session.user.id.trim() : "";
  if (sid.length > 0) {
    const hit = await prisma.user.findUnique({
      where: { id: sid },
      select: { id: true },
    });
    if (hit) return hit;
  }

  for (const em of await emailsFromSessionAndCookie(session, request)) {
    const row = await prisma.user.findFirst({
      where: { email: { equals: em, mode: "insensitive" } },
      select: { id: true },
    });
    if (row) return row;
  }

  return null;
}

/** Same as job seeker resolver, for employer dashboards and uploads. */
export async function resolveEmployerDbUserForDashboard(
  session: Session | null,
  request?: NextRequest,
): Promise<{ id: string } | null> {
  if (!session?.user) return null;
  const isEmployer =
    session.user.role === UserRole.EMPLOYER ||
    String(session.user.role ?? "").toUpperCase() === UserRole.EMPLOYER;
  if (!isEmployer) return null;

  const prisma = getPrisma();
  const sid = typeof session.user.id === "string" ? session.user.id.trim() : "";
  if (sid.length > 0) {
    const hit = await prisma.user.findUnique({
      where: { id: sid },
      select: { id: true, role: true },
    });
    if (hit?.role === UserRole.EMPLOYER) {
      return { id: hit.id };
    }
  }

  for (const em of await emailsFromSessionAndCookie(session, request)) {
    const row = await prisma.user.findFirst({
      where: {
        email: { equals: em, mode: "insensitive" },
        role: UserRole.EMPLOYER,
      },
      select: { id: true },
    });
    if (row) return row;
  }

  return null;
}
