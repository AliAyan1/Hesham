import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/settings-defaults";

export const PRICES = {
  PROFESSIONAL: DEFAULT_PLATFORM_SETTINGS.proPlanPrice,
  PREMIUM: DEFAULT_PLATFORM_SETTINGS.premiumPlanPrice,
  VAT_RATE: 0.15,
} as const;

export const SUBSCRIPTION_PLAN_PRICES_SAR = {
  PROFESSIONAL: PRICES.PROFESSIONAL,
  PREMIUM: PRICES.PREMIUM,
} as const;

/** VAT-inclusive totals for Moyasar (halalas). */
export function calculatePrice(baseAmount: number, vatRate = PRICES.VAT_RATE) {
  const vat = Math.round(baseAmount * vatRate * 100) / 100;
  const total = Math.round((baseAmount + vat) * 100) / 100;
  const halalas = Math.round(total * 100);
  return { base: baseAmount, vat, total, halalas };
}

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLAN_PRICES_SAR;

/** Fallback for client-side display before public settings load. */
export function subscriptionBaseAmountSync(plan: SubscriptionPlanKey): number {
  return SUBSCRIPTION_PLAN_PRICES_SAR[plan];
}
