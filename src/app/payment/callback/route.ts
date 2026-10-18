import type { NextRequest } from "next/server";
import { handleNgeniusPaymentCallback } from "@/lib/payments/ngenius-callback";

/** N-Genius redirect URL (hosted checkout returns here with ?ref=). */
export async function GET(request: NextRequest) {
  return handleNgeniusPaymentCallback(request);
}
