import type { MoyasarApiPayment } from "@/types/moyasar";

const MOYASAR_API_URL = "https://api.moyasar.com/v1";

function secretKey(): string {
  const key = process.env.MOYASAR_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("MOYASAR_SECRET_KEY is not configured");
  }
  return key;
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${secretKey()}:`).toString("base64")}`;
}

export async function createPayment({
  amount,
  description,
  callbackUrl,
  metadata,
}: {
  amount: number;
  description: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}): Promise<MoyasarApiPayment> {
  const response = await fetch(`${MOYASAR_API_URL}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      amount,
      currency: "SAR",
      description,
      callback_url: callbackUrl,
      metadata,
    }),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(error.message ?? "Payment creation failed");
  }

  return response.json() as Promise<MoyasarApiPayment>;
}

export async function getPayment(paymentId: string): Promise<MoyasarApiPayment> {
  const response = await fetch(`${MOYASAR_API_URL}/payments/${paymentId}`, {
    headers: {
      Authorization: authHeader(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch payment");
  }

  return response.json() as Promise<MoyasarApiPayment>;
}

export function calculateVAT(amount: number): {
  base: number;
  vat: number;
  total: number;
} {
  const vat = Math.round(amount * 0.15 * 100) / 100;
  const total = Math.round((amount + vat) * 100) / 100;
  return { base: amount, vat, total };
}

export function toHalalas(sar: number): number {
  return Math.round(sar * 100);
}

export function fromHalalas(halalas: number): number {
  return halalas / 100;
}
