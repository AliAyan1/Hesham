import type { NextRequest } from "next/server";
import { handleNgeniusPaymentCallback } from "@/lib/payments/ngenius-callback";

export async function GET(request: NextRequest) {
  return handleNgeniusPaymentCallback(request);
}
