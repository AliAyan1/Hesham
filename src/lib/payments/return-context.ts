export const PAYMENT_RETURN_STORAGE_KEY = "qt-payment-return-context";

export type PaymentReturnContext = {
  dashboardRole: string;
  locale: string;
  /** Google signup on /auth/register/complete — mark onboarding done after 3DS return. */
  finalizeSignup?: boolean;
};

export function savePaymentReturnContext(ctx: PaymentReturnContext): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PAYMENT_RETURN_STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
}

export function loadPaymentReturnContext(): PaymentReturnContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PAYMENT_RETURN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PaymentReturnContext;
  } catch {
    return null;
  }
}

export function clearPaymentReturnContext(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PAYMENT_RETURN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
