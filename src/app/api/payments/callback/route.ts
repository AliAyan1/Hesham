import { NextResponse, type NextRequest } from "next/server";

function appOrigin(): string {
  const raw = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const locale = url.searchParams.get("locale") ?? "en";
  const redirectPath =
    status === "paid"
      ? `/${locale}/dashboard?payment=success`
      : `/${locale}/dashboard?payment=failed`;

  return NextResponse.redirect(new URL(redirectPath, appOrigin()));
}
