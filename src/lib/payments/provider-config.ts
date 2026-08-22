export type PaymentMethodsConfig = {
  moyasar: boolean;
  applePay: boolean;
  tabby: boolean;
  tamara: boolean;
  isTestMode: boolean;
};

export function tabbyConfigured(): boolean {
  return Boolean(
    process.env.TABBY_SECRET_KEY?.trim() && process.env.TABBY_MERCHANT_CODE?.trim(),
  );
}

export function tamaraConfigured(): boolean {
  return Boolean(process.env.TAMARA_API_TOKEN?.trim());
}

export function moyasarConfigured(): boolean {
  return Boolean(
    process.env.MOYASAR_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY?.trim(),
  );
}

export function tabbyApiBase(): string {
  return (process.env.TABBY_API_BASE ?? "https://api.tabby.sa").replace(/\/$/, "");
}

export function tamaraApiBase(): string {
  const token = process.env.TAMARA_API_TOKEN?.trim() ?? "";
  if (process.env.TAMARA_API_BASE?.trim()) {
    return process.env.TAMARA_API_BASE.trim().replace(/\/$/, "");
  }
  return token.startsWith("eyJ") && token.includes("sandbox")
    ? "https://api-sandbox.tamara.co"
    : process.env.TAMARA_SANDBOX === "true"
      ? "https://api-sandbox.tamara.co"
      : "https://api.tamara.co";
}

export function appOrigin(): string {
  const raw = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function getPaymentMethodsConfig(): PaymentMethodsConfig {
  const publishableKey = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY?.trim() ?? "";
  const moyasar = moyasarConfigured();
  // Apple Pay needs domain verification + Safari. Auto-enabling it with every
  // Moyasar setup can break the card form on Chrome/Windows — opt in only.
  const applePay =
    moyasar &&
    (process.env.NEXT_PUBLIC_MOYASAR_APPLE_PAY === "true" ||
      process.env.MOYASAR_APPLE_PAY === "true");
  return {
    moyasar,
    applePay,
    tabby: tabbyConfigured(),
    tamara: tamaraConfigured(),
    isTestMode: publishableKey.startsWith("pk_test_"),
  };
}
