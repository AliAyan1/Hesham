/**
 * Diagnose N-Genius credentials (run: node scripts/verify-ngenius.mjs)
 * Loads .env.local via dotenv if present.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const key = process.env.NGENIUS_API_KEY?.trim();
const outlet = process.env.NGENIUS_OUTLET_REFERENCE?.trim();
const base = process.env.NGENIUS_API_URL?.trim()?.replace(/\/$/, "");

if (!key || !outlet || !base) {
  console.error("Missing NGENIUS_API_KEY, NGENIUS_OUTLET_REFERENCE, or NGENIUS_API_URL");
  process.exit(1);
}

const realm = base.includes("sandbox")
  ? "ni"
  : base.includes("ngenius-payments.com")
    ? "networkinternational"
    : process.env.NGENIUS_REALM?.trim();

async function main() {
  console.log("API host:", new URL(base).host);
  console.log("Outlet (last 8):", outlet.slice(-8));
  console.log("Identity realm:", realm ?? "(default)");

  const authRes = await fetch(`${base}/identity/auth/access-token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${key}`,
      "Content-Type": "application/vnd.ni-identity.v1+json",
      Accept: "application/vnd.ni-identity.v1+json",
    },
    body: JSON.stringify(
      realm ? { grant_type: "client_credentials", realm } : { grant_type: "client_credentials" },
    ),
  });
  const authText = await authRes.text();
  if (!authRes.ok) {
    console.error("FAIL auth:", authRes.status, authText.slice(0, 300));
    process.exit(1);
  }
  const { access_token: token } = JSON.parse(authText);
  console.log("OK auth: access token received");

  const outletRes = await fetch(`${base}/transactions/outlets/${outlet}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.ni-payment.v2+json",
    },
  });
  console.log(
    outletRes.ok ? "OK outlet: readable with this key" : `WARN outlet GET: ${outletRes.status}`,
  );

  const orderRes = await fetch(`${base}/transactions/outlets/${outlet}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/vnd.ni-payment.v2+json",
      Accept: "application/vnd.ni-payment.v2+json",
    },
    body: JSON.stringify({
      action: "PURCHASE",
      amount: { currencyCode: "SAR", value: 100 },
      merchantAttributes: {
        redirectUrl: "https://www.basalim-consulting.com/payment/callback",
      },
    }),
  });
  const orderText = await orderRes.text();
  if (!orderRes.ok) {
    console.error("FAIL create order:", orderRes.status, orderText.slice(0, 400));
    if (orderRes.status === 403) {
      console.error(`
→ 403 Access Denied: your key is NOT allowed to create orders on this outlet.
  Use a Merchant service account (not Hosted Session only) and match outlet + API key to the same merchant.
`);
    }
    if (orderRes.status === 422 && orderText.includes("configFetchError")) {
      console.error(`
→ 422 Outlet configuration error: N-Genius cannot load payment settings for outlet ...${outlet.slice(-8)}.
  1. Portal → Settings → Organizational Hierarchy → select your LIVE SAR outlet (square icon)
  2. Copy Outlet Reference again → NGENIUS_OUTLET_REFERENCE (Vercel + .env.local)
  3. Ensure hosted payment page / SAR is enabled on that outlet
  4. Contact Network International support with error "configFetchError" if the outlet looks active but orders still fail
`);
    }
    process.exit(1);
  }

  const order = JSON.parse(orderText);
  const payUrl = order._links?.payment?.href ?? order._links?.["cnp:payment-link"]?.href;
  console.log("OK create order:", payUrl ? "payment URL present" : "missing payment link");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
