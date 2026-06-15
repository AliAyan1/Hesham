import { NextResponse } from "next/server";

/** Tamara partner notification endpoint — fulfilment handled on redirect; acknowledge events. */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ received: true });
}
