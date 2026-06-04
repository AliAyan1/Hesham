import type { SubscriptionTier } from "@prisma/client";

const TIER_MONTHLY_SAR: Record<SubscriptionTier, number> = {
  FREE: 0,
  PROFESSIONAL: 99,
  PREMIUM: 299,
};

export function subscriptionAmountForTier(tier: SubscriptionTier): number {
  return TIER_MONTHLY_SAR[tier] ?? 0;
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(d: Date, locale = "en"): string {
  return d.toLocaleString(locale, { month: "short", year: "2-digit" });
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
