import { NextResponse } from "next/server";
import { getPaymentMethodsConfig } from "@/lib/payments/provider-config";
import { isTestingMode } from "@/lib/testing-mode";

/** Runtime check — publishable key is safe to expose; secret presence only returns boolean. */
export async function GET(): Promise<NextResponse> {
  const publishableKey = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY?.trim() ?? "";
  const methods = getPaymentMethodsConfig();

  // TESTING MODE - REVERT BEFORE LAUNCH: hide payment UI triggers on client.
  const configured = isTestingMode() ? false : methods.moyasar;

  return NextResponse.json({
    configured,
    testingMode: isTestingMode(),
    publishableKey: publishableKey.length > 0 ? publishableKey : null,
    secretConfigured: Boolean(process.env.MOYASAR_SECRET_KEY?.trim()),
    isTestMode: methods.isTestMode,
    methods: {
      card: methods.moyasar,
      applePay: methods.applePay,
      tabby: methods.tabby,
      tamara: methods.tamara,
    },
  });
}
