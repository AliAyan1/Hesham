import { NextResponse } from "next/server";

/** Runtime check — publishable key is safe to expose; secret presence only returns boolean. */
export async function GET(): Promise<NextResponse> {
  const publishableKey = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY?.trim() ?? "";
  const secretConfigured = Boolean(process.env.MOYASAR_SECRET_KEY?.trim());

  return NextResponse.json({
    configured: publishableKey.length > 0 && secretConfigured,
    publishableKey: publishableKey.length > 0 ? publishableKey : null,
    secretConfigured,
  });
}
