import type { PlatformSettings } from "@prisma/client";
import { getPrisma, isPrismaConnectionError } from "@/lib/db";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/settings-defaults";
import type { PublicPlatformSettings, PlatformSettingsDto } from "@/lib/settings-types";

export type { PublicPlatformSettings, PlatformSettingsDto };

let settingsCache: PlatformSettings | null = null;
let settingsCacheTime = 0;
/** Dedupes concurrent SSR fetches under connection_limit=1 on Vercel. */
let settingsInflight: Promise<PlatformSettings> | null = null;

export const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

function withDefaults(row: PlatformSettings | null): PlatformSettings {
  if (row) return row;
  return {
    id: "defaults",
    ...DEFAULT_PLATFORM_SETTINGS,
    updatedAt: new Date(),
    updatedBy: null,
  };
}

export function toSettingsDto(row: PlatformSettings): PlatformSettingsDto {
  return {
    id: row.id,
    platformName: row.platformName,
    platformNameAr: row.platformNameAr,
    platformUrl: row.platformUrl,
    supportEmail: row.supportEmail,
    proPlanPrice: row.proPlanPrice,
    premiumPlanPrice: row.premiumPlanPrice,
    vatPercentage: row.vatPercentage,
    mentorCommission: row.mentorCommission,
    mentorPayout: row.mentorPayout,
    assessmentPassScore: row.assessmentPassScore,
    assessmentRetakeLimit: row.assessmentRetakeLimit,
    interviewQuestionCount: row.interviewQuestionCount,
    talentPoolMinScore: row.talentPoolMinScore,
    talentPoolMinProfile: row.talentPoolMinProfile,
    isRegistrationOpen: row.isRegistrationOpen,
    isMentorMarketOpen: row.isMentorMarketOpen,
    isAssessmentRequired: row.isAssessmentRequired,
    isProctorEnabled: row.isProctorEnabled,
    isMaintenanceMode: row.isMaintenanceMode,
    sendWelcomeEmail: row.sendWelcomeEmail,
    sendAssessmentInvite: row.sendAssessmentInvite,
    sendJobMatchEmail: row.sendJobMatchEmail,
    sendAssessmentResults: row.sendAssessmentResults,
    sendApplicationStatus: row.sendApplicationStatus,
    sendInterviewInvite: row.sendInterviewInvite,
    sendOfferLetter: row.sendOfferLetter,
    sendSessionReminder: row.sendSessionReminder,
    maxJobsPerEmployer: row.maxJobsPerEmployer,
    maxApplicationsPerJob: row.maxApplicationsPerJob,
    freeUserJobAlerts: row.freeUserJobAlerts,
    maintenanceMessage: row.maintenanceMessage,
    maintenanceMessageAr: row.maintenanceMessageAr,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  };
}

export function toPublicSettings(row: PlatformSettings): PublicPlatformSettings {
  return {
    platformName: row.platformName,
    platformNameAr: row.platformNameAr,
    proPlanPrice: row.proPlanPrice,
    premiumPlanPrice: row.premiumPlanPrice,
    vatPercentage: row.vatPercentage,
    isRegistrationOpen: row.isRegistrationOpen,
    isMaintenanceMode: row.isMaintenanceMode,
    isMentorMarketOpen: row.isMentorMarketOpen,
    assessmentPassScore: row.assessmentPassScore,
    maintenanceMessage: row.maintenanceMessage,
    maintenanceMessageAr: row.maintenanceMessageAr,
  };
}

export async function getSettings(): Promise<PlatformSettings> {
  const now = Date.now();
  if (settingsCache && now - settingsCacheTime < SETTINGS_CACHE_TTL_MS) {
    return settingsCache;
  }

  if (!settingsInflight) {
    settingsInflight = (async () => {
      try {
        const prisma = getPrisma();
        const row = await prisma.platformSettings.findFirst();
        settingsCache = withDefaults(row);
        settingsCacheTime = Date.now();
        return settingsCache;
      } catch (error) {
        // Never crash marketing pages if settings DB is down or pool is exhausted.
        if (isPrismaConnectionError(error)) {
          console.warn("[settings] Database unreachable, using cached or default settings");
        } else {
          console.error("[settings] Failed to load platform settings, using cached or defaults", error);
        }
        if (settingsCache) return settingsCache;
        return withDefaults(null);
      } finally {
        settingsInflight = null;
      }
    })();
  }

  return settingsInflight;
}

export async function getPublicSettings(): Promise<PublicPlatformSettings> {
  const settings = await getSettings();
  return toPublicSettings(settings);
}

export function clearSettingsCache(): void {
  settingsCache = null;
  settingsCacheTime = 0;
}

export async function getAssessmentPassScore(): Promise<number> {
  const settings = await getSettings();
  return settings.assessmentPassScore;
}

export async function getPlanPrices(): Promise<{
  professional: number;
  premium: number;
  vatPercentage: number;
}> {
  const settings = await getSettings();
  return {
    professional: settings.proPlanPrice,
    premium: settings.premiumPlanPrice,
    vatPercentage: settings.vatPercentage,
  };
}

export async function getAssessmentRetakeLimit(): Promise<number> {
  const settings = await getSettings();
  return settings.assessmentRetakeLimit;
}

export async function getTalentPoolThresholds(): Promise<{
  minScore: number;
  minProfile: number;
}> {
  const settings = await getSettings();
  return {
    minScore: settings.talentPoolMinScore,
    minProfile: settings.talentPoolMinProfile,
  };
}

export async function getMentorCommissionRate(): Promise<number> {
  const settings = await getSettings();
  return settings.mentorCommission / 100;
}

export async function getMentorPayoutRate(): Promise<number> {
  const settings = await getSettings();
  return settings.mentorPayout / 100;
}

export async function isRegistrationOpen(): Promise<boolean> {
  const settings = await getSettings();
  return settings.isRegistrationOpen;
}

export async function isMentorMarketOpen(): Promise<boolean> {
  const settings = await getSettings();
  return settings.isMentorMarketOpen;
}
