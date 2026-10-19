import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/settings-defaults";

export const PRICES = {
  PROFESSIONAL: DEFAULT_PLATFORM_SETTINGS.proPlanPrice,
  PREMIUM: DEFAULT_PLATFORM_SETTINGS.premiumPlanPrice,
} as const;

export const SUBSCRIPTION_PLAN_PRICES_SAR = {
  PROFESSIONAL: PRICES.PROFESSIONAL,
  PREMIUM: PRICES.PREMIUM,
} as const;

/** Checkout totals (minor units). Amount charged equals base price. */
export function calculatePrice(baseAmount: number) {
  const halalas = Math.round(baseAmount * 100);
  return { base: baseAmount, total: baseAmount, halalas };
}

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLAN_PRICES_SAR;

/** Fallback for client-side display before public settings load. */
export function subscriptionBaseAmountSync(plan: SubscriptionPlanKey): number {
  return SUBSCRIPTION_PLAN_PRICES_SAR[plan];
}
