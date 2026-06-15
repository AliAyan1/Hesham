import { tabbyApiBase } from "@/lib/payments/provider-config";

export type TabbyPaymentStatus =
  | "CREATED"
  | "AUTHORIZED"
  | "CLOSED"
  | "REJECTED"
  | "EXPIRED"
  | string;

export type TabbyPayment = {
  id: string;
  status: TabbyPaymentStatus;
  amount: string;
  currency: string;
};

export type TabbyCheckoutResponse = {
  id: string;
  status: string;
  payment?: TabbyPayment;
  configuration?: {
    available_products?: {
      installments?: Array<{ web_url?: string }>;
    };
  };
};

function authHeaders(): HeadersInit {
  const key = process.env.TABBY_SECRET_KEY?.trim();
  if (!key) throw new Error("tabby_not_configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function createTabbyCheckoutSession(input: {
  amount: number;
  currency: string;
  description: string;
  buyerEmail: string;
  buyerName: string;
  buyerPhone: string;
  orderReferenceId: string;
  merchantUrls: {
    success: string;
    cancel: string;
    failure: string;
  };
  lang: "en" | "ar";
}): Promise<{ paymentId: string; webUrl: string }> {
  const merchantCode = process.env.TABBY_MERCHANT_CODE?.trim();
  if (!merchantCode) throw new Error("tabby_not_configured");

  const res = await fetch(`${tabbyApiBase()}/api/v2/checkout`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      payment: {
        amount: input.amount.toFixed(2),
        currency: input.currency,
        description: input.description,
        buyer: {
          email: input.buyerEmail,
          name: input.buyerName,
          phone: input.buyerPhone,
        },
        order: {
          reference_id: input.orderReferenceId,
          items: [
            {
              title: input.description,
              quantity: 1,
              unit_price: input.amount.toFixed(2),
              category: "subscription",
            },
          ],
        },
      },
      lang: input.lang,
      merchant_code: merchantCode,
      merchant_urls: input.merchantUrls,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`tabby_session_failed:${res.status}:${text}`);
  }

  const json = (await res.json()) as TabbyCheckoutResponse;
  const paymentId = json.payment?.id;
  const webUrl =
    json.configuration?.available_products?.installments?.[0]?.web_url ?? null;

  if (!paymentId || !webUrl) {
    throw new Error("tabby_session_incomplete");
  }

  return { paymentId, webUrl };
}

export async function getTabbyPayment(paymentId: string): Promise<TabbyPayment> {
  const res = await fetch(`${tabbyApiBase()}/api/v2/payments/${paymentId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("tabby_fetch_failed");
  return res.json() as Promise<TabbyPayment>;
}

export async function captureTabbyPayment(paymentId: string): Promise<void> {
  const res = await fetch(`${tabbyApiBase()}/api/v2/payments/${paymentId}/captures`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const existing = await getTabbyPayment(paymentId).catch(() => null);
    if (existing?.status === "CLOSED") return;
    throw new Error("tabby_capture_failed");
  }
}

export function tabbyIsPaid(status: TabbyPaymentStatus): boolean {
  return status === "AUTHORIZED" || status === "CLOSED";
}
