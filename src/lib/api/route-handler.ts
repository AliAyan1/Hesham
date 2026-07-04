import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { getServerSession } from "@/lib/get-server-session";

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiFailure(message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function apiError(message = "Something went wrong", status = 500): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function requireAuthSession(
  routeName: string,
): Promise<{ session: Session } | { response: NextResponse }> {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return { response: apiFailure("Unauthorized", 401) };
    }
    return { session };
  } catch (error) {
    console.error(`[${routeName}] auth error:`, error);
    return { response: apiError() };
  }
}

export async function runApiRoute<T>(
  routeName: string,
  handler: () => Promise<NextResponse<T> | NextResponse>,
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    console.error(`[${routeName}] error:`, error);
    return apiError();
  }
}
