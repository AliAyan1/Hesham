import { NextResponse, type NextRequest } from "next/server";

function appOrigin(): string {
  const raw = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

function localeFromReferer(request: NextRequest): string {
  const ref = request.headers.get("referer");
  if (ref) {
    try {
      const path = new URL(ref).pathname;
      const seg = path.split("/")[1];
      if (seg && seg.length === 2) return seg;
    } catch {
      /* ignore */
    }
  }
  return "en";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("id");
  const status = url.searchParams.get("status");
  const message = url.searchParams.get("message");
  const locale = url.searchParams.get("locale") ?? localeFromReferer(request);

  const params = new URLSearchParams();
  if (paymentId) params.set("id", paymentId);
  if (status) params.set("status", status);
  if (message) params.set("message", message);

  const redirectPath = `/${locale}/payments/complete${params.toString() ? `?${params.toString()}` : ""}`;
  return NextResponse.redirect(new URL(redirectPath, appOrigin()));
}
