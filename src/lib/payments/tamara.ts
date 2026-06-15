import { tamaraApiBase } from "@/lib/payments/provider-config";

export type TamaraCheckoutResponse = {
  order_id: string;
  checkout_id: string;
  status: string;
  checkout_url: string;
};

export type TamaraOrder = {
  order_id: string;
  status: string;
  total_amount?: { amount: number; currency: string };
};

function authHeaders(): HeadersInit {
  const token = process.env.TAMARA_API_TOKEN?.trim();
  if (!token) throw new Error("tamara_not_configured");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function createTamaraCheckoutSession(input: {
  orderReferenceId: string;
  description: string;
  totalAmount: number;
  taxAmount: number;
  currency: string;
  consumerEmail: string;
  consumerFirstName: string;
  consumerLastName: string;
  consumerPhone: string;
  locale: string;
  merchantUrls: {
    success: string;
    failure: string;
    cancel: string;
    notification: string;
  };
}): Promise<{ orderId: string; checkoutUrl: string }> {
  const res = await fetch(`${tamaraApiBase()}/checkout`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      order_reference_id: input.orderReferenceId,
      order_number: input.orderReferenceId,
      total_amount: { amount: input.totalAmount, currency: input.currency },
      tax_amount: { amount: input.taxAmount, currency: input.currency },
      shipping_amount: { amount: 0, currency: input.currency },
      description: input.description,
      country_code: "SA",
      payment_type: "PAY_BY_INSTALMENTS",
      instalments: 3,
      locale: input.locale === "ar" ? "ar_SA" : "en_US",
      platform: "web",
      is_mobile: false,
      consumer: {
        email: input.consumerEmail,
        first_name: input.consumerFirstName,
        last_name: input.consumerLastName,
        phone_number: input.consumerPhone,
      },
      shipping_address: {
        first_name: input.consumerFirstName,
        last_name: input.consumerLastName,
        line1: "Riyadh",
        city: "Riyadh",
        country_code: "SA",
        phone_number: input.consumerPhone,
      },
      items: [
        {
          reference_id: input.orderReferenceId,
          type: "Digital",
          name: input.description,
          sku: input.orderReferenceId,
          quantity: 1,
          total_amount: { amount: input.totalAmount, currency: input.currency },
        },
      ],
      merchant_url: input.merchantUrls,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`tamara_session_failed:${res.status}:${text}`);
  }

  const json = (await res.json()) as TamaraCheckoutResponse;
  if (!json.order_id || !json.checkout_url) {
    throw new Error("tamara_session_incomplete");
  }

  return { orderId: json.order_id, checkoutUrl: json.checkout_url };
}

export async function getTamaraOrder(orderId: string): Promise<TamaraOrder> {
  const res = await fetch(`${tamaraApiBase()}/orders/${orderId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("tamara_fetch_failed");
  return res.json() as Promise<TamaraOrder>;
}

export async function authoriseTamaraOrder(orderId: string): Promise<void> {
  const res = await fetch(`${tamaraApiBase()}/orders/${orderId}/authorise`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const order = await getTamaraOrder(orderId).catch(() => null);
    const s = order?.status?.toLowerCase() ?? "";
    if (s === "authorised" || s === "authorized" || s === "fully_captured") return;
    throw new Error("tamara_authorise_failed");
  }
}

export function tamaraIsApproved(status: string): boolean {
  const s = status.toLowerCase();
  return (
    s === "approved" ||
    s === "authorised" ||
    s === "authorized" ||
    s === "fully_captured"
  );
}
