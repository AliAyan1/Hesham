import { NextResponse } from "next/server";

export function apiErrorResponse(
  route: string,
  error: unknown,
  status = 500,
): NextResponse<{ error: string }> {
  console.error(`[${route}]`, error);
  return NextResponse.json(
    { error: "An error occurred. Please try again." },
    { status },
  );
}
