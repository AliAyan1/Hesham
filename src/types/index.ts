import type { DefaultSession } from "next-auth";
import {
  ApplicationStatus as PrismaApplicationStatus,
  SubscriptionTier as PrismaSubscriptionTier,
  UserRole as PrismaUserRole,
} from "@prisma/client";

// ─── Enums ────────────────────────────────────────────────────────────────────

/** Re-export Prisma enums so app + DB types stay aligned. */
export const UserRole = PrismaUserRole;
export type UserRole = PrismaUserRole;

/** Re-export Prisma enums so app + DB types stay aligned. */
export const ApplicationStatus = PrismaApplicationStatus;
export type ApplicationStatus = PrismaApplicationStatus;

/** Re-export Prisma enums so app + DB types stay aligned. */
export const SubscriptionTier = PrismaSubscriptionTier;
export type SubscriptionTier = PrismaSubscriptionTier;

// ─── Core Interfaces ──────────────────────────────────────────────────────────

export interface IUser {
  id: string;
  name: string | null;
  email: string;
  password?: string | null;
  role: UserRole;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProfile {
  id: string;
  userId: string;
  bio: string | null;
  phone: string | null;
  location: string | null;
  language: string;
  cvUrl: string | null;
  atsScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJob {
  id: string;
  employerId: string;
  title: string;
  titleAr: string | null;
  description: string;
  descriptionAr: string | null;
  category: string;
  location: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApplication {
  id: string;
  jobId: string;
  jobSeekerId: string;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/** Employer-only view of a candidate tied to one application (see GET …/applications/[id]/candidate). */
export type EmployerCandidatePayload = {
  applicationId: string;
  appliedForJobTitle: string;
  candidate: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    profile: {
      bio: string | null;
      phone: string | null;
      location: string | null;
      nationality: string | null;
    } | null;
    cv: {
      fullName: string | null;
      professionalTitle: string | null;
      summary: string | null;
      experience: unknown;
      education: unknown;
      skills: unknown;
      languages: unknown;
      certifications: unknown;
      portfolioUrl: string | null;
      linkedinUrl: string | null;
    } | null;
  };
};

// ─── Auth Session ─────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  image: string | null;
}

export type AuthSession = DefaultSession & {
  user: AuthUser;
};

// ─── Form Types ───────────────────────────────────────────────────────────────

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface ProfileFormData {
  bio?: string;
  phone?: string;
  location?: string;
  language?: string;
}

export interface JobFormData {
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  category: string;
  location?: string;
}
