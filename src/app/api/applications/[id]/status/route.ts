import { NextResponse, type NextRequest } from "next/server";
import { PATCH as employerApplicationPatch } from "@/app/api/employer/applications/[applicationId]/route";
import { runApiRoute } from "@/lib/api/route-handler";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  return runApiRoute("applications/status", async () => {
    const { id } = await context.params;
    return employerApplicationPatch(request, {
      params: Promise.resolve({ applicationId: id }),
    });
  });
}
