import { NextResponse, NextRequest } from "next/server";
import { POST as saveJob } from "@/app/api/jobs/save/route";
import { runApiRoute } from "@/lib/api/route-handler";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  return runApiRoute("jobs/save", async () => {
    const { jobId } = await context.params;
    const raw: unknown = await request.json().catch(() => ({}));
    const saved =
      raw && typeof raw === "object" && "saved" in raw
        ? Boolean((raw as { saved?: unknown }).saved)
        : true;

    const forwarded = new NextRequest(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({ jobId, saved }),
    });

    return saveJob(forwarded);
  });
}
