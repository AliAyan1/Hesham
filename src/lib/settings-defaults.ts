import type { PlatformSettings } from "@prisma/client";

export type PlatformSettingsInput = Omit<
  PlatformSettings,
  "id" | "updatedAt" | "updatedBy"
>;

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsInput = {
  platformName: "QudrahTech",
  platformNameAr: "قدرتك",
  platformUrl: "https://basalim-consulting.com",
  supportEmail: "support@basalim-consulting.com",
  proPlanPrice: 99,
  premiumPlanPrice: 299,
  vatPercentage: 15,
  mentorCommission: 25,
  mentorPayout: 75,
  assessmentPassScore: 50,
  assessmentRetakeLimit: 3,
  interviewQuestionCount: 5,
  talentPoolMinScore: 50,
  talentPoolMinProfile: 80,
  isRegistrationOpen: true,
  isMentorMarketOpen: true,
  isAssessmentRequired: true,
  isProctorEnabled: true,
  isMaintenanceMode: false,
  sendWelcomeEmail: true,
  sendAssessmentInvite: true,
  sendJobMatchEmail: true,
  sendAssessmentResults: true,
  sendApplicationStatus: true,
  sendInterviewInvite: true,
  sendOfferLetter: true,
  sendSessionReminder: true,
  maxJobsPerEmployer: 10,
  maxApplicationsPerJob: 500,
  freeUserJobAlerts: 3,
  maintenanceMessage: "We are updating QudrahTech. We will be back shortly!",
  maintenanceMessageAr: "قدرتك تتحدث",
};
