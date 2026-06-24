import { getSettings } from "@/lib/settings";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/settings-defaults";

export const SUBSCRIPTION_PLAN_PRICES_SAR = {
  PROFESSIONAL: DEFAULT_PLATFORM_SETTINGS.proPlanPrice,
  PREMIUM: DEFAULT_PLATFORM_SETTINGS.premiumPlanPrice,
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLAN_PRICES_SAR;

export async function getSubscriptionPlanPrices(): Promise<{
  PROFESSIONAL: number;
  PREMIUM: number;
  vatPercentage: number;
}> {
  const settings = await getSettings();
  return {
    PROFESSIONAL: settings.proPlanPrice,
    PREMIUM: settings.premiumPlanPrice,
    vatPercentage: settings.vatPercentage,
  };
}

export async function subscriptionBaseAmount(plan: SubscriptionPlanKey): Promise<number> {
  const prices = await getSubscriptionPlanPrices();
  return prices[plan];
}

/** Fallback for client-side display before public settings load. */
export function subscriptionBaseAmountSync(plan: SubscriptionPlanKey): number {
  return SUBSCRIPTION_PLAN_PRICES_SAR[plan];
}
