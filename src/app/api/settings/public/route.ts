import { NextResponse } from "next/server";
import { getPublicSettings, SETTINGS_CACHE_TTL_MS } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const settings = await getPublicSettings();
    const maxAge = Math.floor(SETTINGS_CACHE_TTL_MS / 1000);

    return NextResponse.json(settings, {
      headers: {
        "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${maxAge}`,
      },
    });
  } catch (error) {
    console.error("[settings/public] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
