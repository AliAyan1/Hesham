import { getSettings } from "@/lib/settings";

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
