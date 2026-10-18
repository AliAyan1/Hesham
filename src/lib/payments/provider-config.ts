export type PaymentMethodsConfig = {
  ngenius: boolean;
  tabby: boolean;
  tamara: boolean;
};

export function tabbyConfigured(): boolean {
  return Boolean(
    process.env.TABBY_SECRET_KEY?.trim() && process.env.TABBY_MERCHANT_CODE?.trim(),
  );
}

export function tamaraConfigured(): boolean {
  return Boolean(process.env.TAMARA_API_TOKEN?.trim());
}

export function ngeniusConfigured(): boolean {
  return Boolean(
    process.env.NGENIUS_API_KEY?.trim() &&
      process.env.NGENIUS_OUTLET_REFERENCE?.trim() &&
      process.env.NGENIUS_API_URL?.trim(),
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
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function getPaymentMethodsConfig(): PaymentMethodsConfig {
  const ngenius = ngeniusConfigured();
  return {
    ngenius,
    tabby: tabbyConfigured(),
    tamara: tamaraConfigured(),
  };
}
