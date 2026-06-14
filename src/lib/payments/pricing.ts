export const SUBSCRIPTION_PLAN_PRICES_SAR = {
  PROFESSIONAL: 99,
  PREMIUM: 299,
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLAN_PRICES_SAR;

export function subscriptionBaseAmount(plan: SubscriptionPlanKey): number {
  return SUBSCRIPTION_PLAN_PRICES_SAR[plan];
}
