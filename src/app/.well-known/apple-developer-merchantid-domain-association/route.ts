import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const FILE_NAME = "apple-developer-merchantid-domain-association";

/** Apple Pay domain verification — Moyasar fetches this URL (must return 200, text/plain). */
export async function GET(): Promise<NextResponse> {
  const fromEnv = process.env.MOYASAR_APPLE_PAY_DOMAIN_ASSOCIATION?.trim();
  if (fromEnv) {
    return new NextResponse(fromEnv, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  try {
    const filePath = path.join(process.cwd(), "public", ".well-known", FILE_NAME);
    const body = await readFile(filePath, "utf8");
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new NextResponse("Apple Pay domain file not configured", { status: 404 });
  }
}
