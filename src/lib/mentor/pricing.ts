import { getSettings } from "@/lib/settings";
import { MENTOR_PLATFORM_FEE_RATE } from "@/lib/mentor/constants";

export async function calculateSessionPricing(
  hourlyRate: number,
  durationMinutes: number,
): Promise<{
  price: number;
  platformFee: number;
  mentorEarning: number;
}> {
  const settings = await getSettings();
  const platformFeeRate = settings.mentorCommission / 100;
  const hours = durationMinutes / 60;
  const price = Math.round(hourlyRate * hours * 100) / 100;
  const platformFee = Math.round(price * platformFeeRate * 100) / 100;
  const mentorEarning = Math.round((price - platformFee) * 100) / 100;
  return { price, platformFee, mentorEarning };
}

/** Sync fallback using default commission rate (client display). */
export function calculateSessionPricingSync(
  hourlyRate: number,
  durationMinutes: number,
): {
  price: number;
  platformFee: number;
  mentorEarning: number;
} {
  const hours = durationMinutes / 60;
  const price = Math.round(hourlyRate * hours * 100) / 100;
  const platformFee = Math.round(price * MENTOR_PLATFORM_FEE_RATE * 100) / 100;
  const mentorEarning = Math.round((price - platformFee) * 100) / 100;
  return { price, platformFee, mentorEarning };
}
