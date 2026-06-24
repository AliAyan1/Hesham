/** Client-safe settings types (no server/db imports). */

export type PublicPlatformSettings = {
  platformName: string;
  platformNameAr: string;
  proPlanPrice: number;
  premiumPlanPrice: number;
  vatPercentage: number;
  isRegistrationOpen: boolean;
  isMaintenanceMode: boolean;
  isMentorMarketOpen: boolean;
  assessmentPassScore: number;
  maintenanceMessage: string;
  maintenanceMessageAr: string;
};

export type PlatformSettingsDto = {
  id: string;
  platformName: string;
  platformNameAr: string;
  platformUrl: string;
  supportEmail: string;
  proPlanPrice: number;
  premiumPlanPrice: number;
  vatPercentage: number;
  mentorCommission: number;
  mentorPayout: number;
  assessmentPassScore: number;
  assessmentRetakeLimit: number;
  interviewQuestionCount: number;
  talentPoolMinScore: number;
  talentPoolMinProfile: number;
  isRegistrationOpen: boolean;
  isMentorMarketOpen: boolean;
  isAssessmentRequired: boolean;
  isProctorEnabled: boolean;
  isMaintenanceMode: boolean;
  sendWelcomeEmail: boolean;
  sendAssessmentInvite: boolean;
  sendJobMatchEmail: boolean;
  sendAssessmentResults: boolean;
  sendApplicationStatus: boolean;
  sendInterviewInvite: boolean;
  sendOfferLetter: boolean;
  sendSessionReminder: boolean;
  maxJobsPerEmployer: number;
  maxApplicationsPerJob: number;
  freeUserJobAlerts: number;
  maintenanceMessage: string;
  maintenanceMessageAr: string;
  updatedAt: string;
  updatedBy: string | null;
};
