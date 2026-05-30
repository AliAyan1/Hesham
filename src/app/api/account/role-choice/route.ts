import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { defaultMentorProfileCreate } from "@/lib/mentor/default-mentor-create";

const bodySchema = z.object({
  role: z.enum(["EMPLOYER", "JOBSEEKER", "MENTOR"]),
});

/** POST — set authenticated user role after Google signup (job seeker, employer, or mentor). */
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
    select: { id: true, role: true, name: true, email: true },
  });
  if (!dbUser || dbUser.role === UserRole.ADMIN) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const pick = parsed.data.role;

  try {
    if (pick === "MENTOR") {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          role: "MENTOR",
          subscriptionTier: "FREE",
          onboardingComplete: false,
          mentorProfile: {
            upsert: {
              create: defaultMentorProfileCreate,
              update: {},
            },
          },
        },
      });
      const { notifyAdminsNewMentorApplication } = await import("@/lib/mentor/notifications");
      await notifyAdminsNewMentorApplication({
        mentorName: dbUser.name ?? dbUser.email,
        mentorUserId: dbUser.id,
      });
      return NextResponse.json({ success: true, data: { role: UserRole.MENTOR } });
    }

    if (pick === "EMPLOYER") {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          role: UserRole.EMPLOYER,
          employerProfile: {
            upsert: {
              create: {},
              update: {},
            },
          },
        },
      });
      return NextResponse.json({ success: true, data: { role: UserRole.EMPLOYER } });
    }

    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        role: UserRole.JOBSEEKER,
        profile: {
          upsert: {
            create: { language: "ar" },
            update: {},
          },
        },
      },
    });
    return NextResponse.json({ success: true, data: { role: UserRole.JOBSEEKER } });
  } catch {
    return NextResponse.json({ success: false, error: "Update failed" }, { status: 500 });
  }
}
