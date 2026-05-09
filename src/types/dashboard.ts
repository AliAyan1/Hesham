import type { Application, Job, User } from "@prisma/client";
import type { NotificationType as PrismaNotificationType, SubscriptionTier } from "@prisma/client";

export type SerializedJobSeekerApplication = Pick<Application, "id" | "status"> & {
  jobId: string;
  jobTitle: string;
  company: string | null;
  createdAt: string;
  /** Reserved for future AI scoring; null shows “not rated” in UI. */
  matchScore: number | null;
};

export type SerializedEmployerApplication = Pick<Application, "id" | "status"> & {
  jobId: string;
  jobTitle: string;
  candidateName: string | null;
  candidateEmail: string;
  createdAt: string;
  matchScore: number | null;
};

export type SerializedRecentUser = Pick<User, "id" | "name" | "email" | "role"> & {
  createdAt: string;
};

export type SerializedRecentJob = Pick<
  Job,
  "id" | "title" | "category" | "isActive"
> & {
  createdAt: string;
};

export type JobSeekerDashboardPayload = {
  profileCompletion: number;
  applicationsCount: number;
  /** Total active listings (browse pool). */
  jobsAvailableCount: number;
  /** Shown as “smart matches” for paid tiers — same pool size until dedicated ranking cache exists. */
  jobMatchesCount: number;
  assessmentScore: number | null;
  atsScore: number | null;
  subscriptionTier: SubscriptionTier;
  recentApplications: SerializedJobSeekerApplication[];
};

export type EmployerDashboardPayload = {
  activeJobsCount: number;
  totalApplicationsCount: number;
  shortlistedCount: number;
  interviewsCount: number;
  applicationsTodayCount: number;
  pendingReviewCount: number;
  jobsExpiringSoonCount: number;
  recentApplications: SerializedEmployerApplication[];
};

export type AdminDashboardPayload = {
  totalJobSeekers: number;
  totalEmployers: number;
  totalJobs: number;
  totalAssessments: number;
  recentUsers: SerializedRecentUser[];
  recentJobs: SerializedRecentJob[];
};

export type NotificationDto = {
  id: string;
  title: string;
  titleAr: string | null;
  message: string;
  messageAr: string | null;
  type: PrismaNotificationType;
  isRead: boolean;
  link: string | null;
  createdAt: string;
};
