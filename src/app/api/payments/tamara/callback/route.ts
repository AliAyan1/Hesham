import { NextResponse, type NextRequest } from "next/server";
import { PaymentProvider } from "@prisma/client";
import { getServerSession } from "@/lib/get-server-session";
import { resolveDbUserIdForSession } from "@/lib/resolve-session-user";
import { appOrigin } from "@/lib/payments/provider-config";
import { findIntentByExternalId } from "@/lib/payments/intent";
import { verifyAndFulfillTamaraPayment } from "@/lib/payments/fulfill";

function localeFromReferer(request: NextRequest): string {
  const ref = request.headers.get("referer");
  if (ref) {
    try {
      const seg = new URL(ref).pathname.split("/")[1];
      if (seg && seg.length === 2) return seg;
    } catch {
      /* ignore */
    }
  }
  return "en";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order_id") ?? url.searchParams.get("orderId");
  const status = url.searchParams.get("status");
  const locale = localeFromReferer(request);
  const origin = appOrigin();

  if (!orderId) {
    return NextResponse.redirect(
      new URL(`/${locale}/payments/complete?provider=tamara&error=missing_id`, origin),
    );
  }

  if (status !== "success") {
    return NextResponse.redirect(
      new URL(`/${locale}/payments/complete?provider=tamara&status=${status ?? "cancel"}`, origin),
    );
  }

  const session = await getServerSession();
  const resolved = session?.user
    ? await resolveDbUserIdForSession(session, request)
    : null;

  const intent = await findIntentByExternalId(PaymentProvider.TAMARA, orderId);
  const userId = resolved?.id ?? intent?.userId;

  if (!userId) {
    return NextResponse.redirect(
      new URL(`/${locale}/auth/login?callbackUrl=/payments/complete`, origin),
    );
  }

  try {
    await verifyAndFulfillTamaraPayment(userId, orderId);
    return NextResponse.redirect(
      new URL(`/${locale}/payments/complete?provider=tamara&order_id=${orderId}&status=paid`, origin),
    );
  } catch {
    return NextResponse.redirect(
      new URL(`/${locale}/payments/complete?provider=tamara&order_id=${orderId}&status=failed`, origin),
    );
  }
}
