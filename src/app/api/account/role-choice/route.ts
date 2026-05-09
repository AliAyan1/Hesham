import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  role: z.enum(["EMPLOYER", "JOBSEEKER"]),
});

/** POST — set authenticated user to Employer or Job seeker with minimal related rows (same as registration). */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ role: UserRole }>>> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
  }

  const prisma = getPrisma();
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!dbUser || dbUser.role === UserRole.ADMIN) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const nextRole = parsed.data.role === "EMPLOYER" ? UserRole.EMPLOYER : UserRole.JOBSEEKER;

  await prisma.user.update({
    where: { id: dbUser.id },
    data:
      nextRole === UserRole.EMPLOYER
        ? {
            role: UserRole.EMPLOYER,
            employerProfile: {
              upsert: {
                create: {},
                update: {},
              },
            },
          }
        : {
            role: UserRole.JOBSEEKER,
            profile: {
              upsert: {
                create: { language: "ar" },
                update: {},
              },
            },
          },
  });

  return NextResponse.json({ success: true, data: { role: nextRole } });
}
