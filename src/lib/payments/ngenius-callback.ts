import { PaymentProvider } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getOrder } from "@/lib/ngenius";
import { fulfillNgeniusCardPayment } from "@/lib/payments/fulfill";
import {
  findIntentByExternalId,
  findPendingIntentByMerchantOrderReference,
  parseIntentMetadata,
} from "@/lib/payments/intent";
import { appOrigin } from "@/lib/payments/provider-config";

function resolveLocale(request: NextRequest): string {
  const fromQuery = request.nextUrl.searchParams.get("locale")?.trim();
  if (fromQuery && fromQuery.length === 2) return fromQuery;
  return "ar";
}

function redirectPath(locale: string, success: boolean): string {
  if (success) return `/${locale}/dashboard?payment=success`;
  return `/${locale}/pricing?payment=failed`;
}

export async function handleNgeniusPaymentCallback(request: NextRequest): Promise<NextResponse> {
  const ref = request.nextUrl.searchParams.get("ref")?.trim();
  const locale = resolveLocale(request);
  const origin = appOrigin();

  if (!ref) {
    console.error("[ngenius-callback] missing ref query param");
    return NextResponse.redirect(new URL(redirectPath(locale, false), origin));
  }

  try {
    const order = await getOrder(ref);
    const captured = order.status === "CAPTURED" || order.status === "PURCHASED";

    if (!captured) {
      console.warn("[ngenius-callback] payment not captured:", { ref, status: order.status });
      return NextResponse.redirect(new URL(redirectPath(locale, false), origin));
    }

    let intent =
      (await findIntentByExternalId(PaymentProvider.MOYASAR, ref)) ??
      (order.merchantOrderReference
        ? await findPendingIntentByMerchantOrderReference(order.merchantOrderReference)
        : null);

    if (!intent) {
      console.error("[ngenius-callback] no pending intent for order", { ref });
      return NextResponse.redirect(new URL(redirectPath(locale, false), origin));
    }

    const meta = parseIntentMetadata(intent.metadataJson) as ReturnType<
      typeof parseIntentMetadata
    > & { locale?: string };
    const navLocale = meta.locale ?? locale;

    await fulfillNgeniusCardPayment(intent.userId, ref, intent);

    return NextResponse.redirect(new URL(redirectPath(navLocale, true), origin));
  } catch (err) {
    console.error("[ngenius-callback] error:", err);
    return NextResponse.redirect(new URL(redirectPath(locale, false), origin));
  }
}
