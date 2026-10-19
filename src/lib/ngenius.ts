const TOKEN_TTL_MS = 3500 * 1000;

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export class NgeniusApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly hint?: string,
  ) {
    super(message);
    this.name = "NgeniusApiError";
  }
}

function identityRealm(): string | undefined {
  const explicit = process.env.NGENIUS_REALM?.trim();
  if (explicit) return explicit;
  const base = process.env.NGENIUS_API_URL ?? "";
  if (base.includes("sandbox")) return "ni";
  if (base.includes("ngenius-payments.com")) return "networkinternational";
  return undefined;
}

function accessTokenBody(): Record<string, string> {
  const realm = identityRealm();
  if (realm) {
    return { grant_type: "client_credentials", realm };
  }
  return { grant_type: "client_credentials" };
}

function apiBase(): string {
  const base = process.env.NGENIUS_API_URL?.trim();
  if (!base) throw new Error("NGENIUS_API_URL is not configured");
  return base.replace(/\/$/, "");
}

function outletRef(): string {
  const ref = process.env.NGENIUS_OUTLET_REFERENCE?.trim();
  if (!ref) throw new Error("NGENIUS_OUTLET_REFERENCE is not configured");
  return ref;
}

function apiKey(): string {
  const key = process.env.NGENIUS_API_KEY?.trim();
  if (!key) throw new Error("NGENIUS_API_KEY is not configured");
  return key;
}

function appPublicOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.accessToken;
  }

  const response = await fetch(`${apiBase()}/identity/auth/access-token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${apiKey()}`,
      "Content-Type": "application/vnd.ni-identity.v1+json",
      Accept: "application/vnd.ni-identity.v1+json",
    },
    body: JSON.stringify(accessTokenBody()),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[ngenius] access token failed:", response.status, body);
    throw new NgeniusApiError(
      "N-Genius authentication failed",
      response.status,
      "auth_failed",
      "Check NGENIUS_API_KEY and NGENIUS_API_URL (sandbox vs live must match the key).",
    );
  }

  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  const accessToken = data.access_token;
  if (!accessToken) throw new Error("N-Genius access token missing from response");

  const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 3600;
  const ttlMs = Math.min(expiresInSec * 1000, TOKEN_TTL_MS);
  cachedToken = { accessToken, expiresAt: now + ttlMs };
  return accessToken;
}

export type NgeniusPaymentSession = {
  paymentUrl: string;
  orderReference: string | null;
};

export async function createPaymentSession(
  amount: number,
  orderId: string,
  email: string,
): Promise<NgeniusPaymentSession> {
  const token = await getAccessToken();
  const origin = appPublicOrigin();
  const redirectUrl = `${origin}/payment/callback`;
  const cancelUrl = `${origin}/ar/pricing`;
  const outlet = outletRef();

  /** Hosted payment page: create an order (not /payment/card — that API expects card PAN). */
  const response = await fetch(`${apiBase()}/transactions/outlets/${outlet}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/vnd.ni-payment.v2+json",
      Accept: "application/vnd.ni-payment.v2+json",
    },
    body: JSON.stringify({
      action: "PURCHASE",
      amount: { currencyCode: "SAR", value: Math.round(amount * 100) },
      emailAddress: email,
      merchantAttributes: {
        redirectUrl,
        cancelUrl,
        merchantOrderReference: orderId,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[ngenius] create order failed:", {
      status: response.status,
      outletSuffix: outlet.slice(-8),
      apiHost: new URL(apiBase()).host,
      body,
    });
    const configError = body.includes("configFetchError") || body.includes("Failed to get configuration");
    let code = "order_failed";
    let hint =
      "Verify NGENIUS_OUTLET_REFERENCE matches the same environment as NGENIUS_API_URL.";
    if (response.status === 403) {
      code = "outlet_access_denied";
      hint =
        "Your API key cannot create orders on this outlet. Use a Merchant service account key from N-Genius Portal (Settings → Integrations → Service Accounts).";
    } else if (response.status === 422 && configError) {
      code = "outlet_not_configured";
      hint =
        "N-Genius cannot load payment config for this outlet. In the portal, confirm the outlet is fully activated (SAR, hosted pay page). Copy a fresh Outlet Reference from Settings → Organizational Hierarchy for the same merchant as your API key. If it still fails, ask Network International to fix outlet configuration (configFetchError).";
    }
    throw new NgeniusApiError(
      "N-Genius payment session creation failed",
      response.status,
      code,
      hint,
    );
  }

  const data = (await response.json()) as {
    reference?: string;
    orderReference?: string;
    _links?: Record<string, { href?: string } | undefined> & {
      payment?: { href?: string };
    };
  };

  const links = data._links;
  const paymentUrl =
    links?.payment?.href ??
    links?.["cnp:payment-link"]?.href ??
    null;

  if (!paymentUrl) {
    console.error("[ngenius] missing payment href:", data);
    throw new Error("N-Genius payment URL missing");
  }

  const orderReference = data.reference ?? data.orderReference ?? null;

  return { paymentUrl, orderReference };
}

export type NgeniusOrderStatus = {
  status: string;
  amountMinor: number | null;
  merchantOrderReference: string | null;
};

function extractPaymentStatus(payload: unknown): NgeniusOrderStatus {
  const root = payload as Record<string, unknown>;
  const embedded = root._embedded as Record<string, unknown> | undefined;
  const paymentList = embedded?.payment;
  const payments = Array.isArray(paymentList) ? paymentList : paymentList ? [paymentList] : [];

  let status = "";
  let amountMinor: number | null = null;

  for (const p of payments) {
    const row = p as Record<string, unknown>;
    const state = row.state ?? row.status;
    if (typeof state === "string" && state.length > 0) {
      status = state.toUpperCase();
    }
    const amount = row.amount as { value?: number } | undefined;
    if (amount?.value != null) amountMinor = amount.value;
    if (status === "CAPTURED") break;
  }

  if (!status && typeof root.state === "string") {
    status = root.state.toUpperCase();
  }

  const merchantAttrs = root.merchantAttributes as { merchantOrderReference?: string } | undefined;
  const merchantOrderReference =
    merchantAttrs?.merchantOrderReference ??
    (typeof root.merchantOrderReference === "string" ? root.merchantOrderReference : null);

  return { status, amountMinor, merchantOrderReference };
}

export async function getOrder(orderRef: string): Promise<NgeniusOrderStatus> {
  const token = await getAccessToken();
  const response = await fetch(
    `${apiBase()}/transactions/outlets/${outletRef()}/orders/${encodeURIComponent(orderRef)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.ni-payment.v2+json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[ngenius] get order failed:", response.status, body);
    throw new Error("N-Genius order lookup failed");
  }

  const data: unknown = await response.json();
  return extractPaymentStatus(data);
}

export function ngeniusConfigured(): boolean {
  return Boolean(
    process.env.NGENIUS_API_KEY?.trim() &&
      process.env.NGENIUS_OUTLET_REFERENCE?.trim() &&
      process.env.NGENIUS_API_URL?.trim(),
  );
}
