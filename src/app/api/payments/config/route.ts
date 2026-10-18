import { NextResponse } from "next/server";
import { getPaymentMethodsConfig } from "@/lib/payments/provider-config";

/** Runtime check — card checkout uses server-side N-Genius session (no client secret). */
export async function GET(): Promise<NextResponse> {
  const methods = getPaymentMethodsConfig();

  return NextResponse.json({
    configured: methods.ngenius,
    isTestMode: false,
    methods: {
      card: methods.ngenius,
      applePay: methods.ngenius,
      tabby: methods.tabby,
      tamara: methods.tamara,
    },
  });
}
