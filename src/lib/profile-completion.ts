import type { Profile } from "@prisma/client";

export function computeProfileCompletionPercent(profile: Profile | null): number {
  if (!profile) return 0;

  /** Omit default `language` alone — new signups get `ar`/`en` without “completing” profile; keeps free tier dashboard at 0% until they add real fields. */
  const checks: boolean[] = [
    Boolean(profile.bio?.trim()),
    Boolean(profile.phone?.trim()),
    Boolean(profile.location?.trim()),
    Boolean(profile.cvUrl?.trim()),
    profile.atsScore != null,
  ];

  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}
