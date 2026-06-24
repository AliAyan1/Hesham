import { NextRequest, NextResponse } from "next/server";
import { getContent } from "@/lib/cms";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const locale = request.nextUrl.searchParams.get("locale") ?? "en";
    const content = await getContent(locale);

    return NextResponse.json(content, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("[cms] fetch failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
