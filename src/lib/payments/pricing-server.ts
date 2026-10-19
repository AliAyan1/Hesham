import { getSettings } from "@/lib/settings";
import type { SubscriptionPlanKey } from "@/lib/payments/pricing";

export async function getSubscriptionPlanPrices(): Promise<{
  PROFESSIONAL: number;
  PREMIUM: number;
}> {
  const settings = await getSettings();
  return {
    PROFESSIONAL: settings.proPlanPrice,
    PREMIUM: settings.premiumPlanPrice,
  };
}

export async function subscriptionBaseAmount(plan: SubscriptionPlanKey): Promise<number> {
  const prices = await getSubscriptionPlanPrices();
  return prices[plan];
}
