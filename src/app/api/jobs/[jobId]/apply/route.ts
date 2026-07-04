import { NextResponse, NextRequest } from "next/server";
import { POST as applyToJob } from "@/app/api/jobs/apply/route";
import { runApiRoute } from "@/lib/api/route-handler";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  return runApiRoute("jobs/apply", async () => {
    const { jobId } = await context.params;
    const raw: unknown = await request.json().catch(() => ({}));
    const payload =
      raw && typeof raw === "object"
        ? { ...(raw as Record<string, unknown>), jobId }
        : { jobId };

    const forwarded = new NextRequest(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(payload),
    });

    return applyToJob(forwarded);
  });
}
