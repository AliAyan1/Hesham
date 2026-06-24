import { getSettings } from "@/lib/settings";
import type { SubscriptionPlanKey } from "@/lib/payments/pricing";

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
