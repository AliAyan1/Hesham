import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { sanitizeUserForPublic } from "@/lib/sanitize-user";
import { runApiRoute, apiSuccess, apiFailure } from "@/lib/api/route-handler";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  return runApiRoute("profile/userId", async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return apiFailure("Unauthorized", 401);
    }

    const { userId } = await context.params;
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        profile: {
          select: {
            bio: true,
            location: true,
            jobPreferences: true,
          },
        },
        employerProfile: {
          select: {
            companyName: true,
            industry: true,
            companySize: true,
            websiteUrl: true,
            description: true,
          },
        },
      },
    });

    if (!user) {
      return apiFailure("Not found", 404);
    }

    const publicUser = sanitizeUserForPublic({
      id: user.id,
      name: user.name,
      email: null,
      image: user.image,
      role: user.role,
    });

    if (user.role === UserRole.JOBSEEKER) {
      return apiSuccess({
        ...publicUser,
        profile: user.profile,
      });
    }

    if (user.role === UserRole.EMPLOYER) {
      return apiSuccess({
        ...publicUser,
        profile: user.employerProfile,
      });
    }

    return apiSuccess(publicUser);
  });
}
